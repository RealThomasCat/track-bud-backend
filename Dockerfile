# syntax=docker/dockerfile:1

# Shared base stage for all backend build stages.
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies in a separate stage so Docker can reuse this layer
# when source files change but package.json/package-lock.json do not.
FROM base AS deps

COPY package*.json ./
RUN npm ci

# Development stage used by docker-compose for local development.
# Source files are bind-mounted in docker-compose for live reload.
FROM base AS dev

ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5000

# Generate Prisma Client on container start, then run the TypeScript dev server.
CMD ["sh", "-c", "npx prisma generate && npm run dev"]

# Build stage for production artifacts.
# Generates Prisma Client and compiles TypeScript into dist/.
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Production runtime stage.
# Starts from a clean Node image and copies only the files needed to run the app.
FROM node:22-alpine AS prod

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 5000

CMD ["node", "dist/server.js"]