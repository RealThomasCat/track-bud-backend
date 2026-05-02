# TrackBud - Backend

TrackBud is a backend system for a personal expense tracking platform designed with a strong focus on data consistency, modular architecture, and scalable backend practices. It provides REST APIs for managing users, transactions, categories, dashboards, and AI-powered financial insights.

---

## Live Deployment

- Backend: https://track-bud-backend.onrender.com
- Frontend: https://track-bud-frontend.vercel.app

---

## Features

### Core Backend Features

- JWT-based authentication using HTTP-only cookies
- User-scoped multi-tenant data isolation
- Transaction management with atomic wallet balance updates
- Category management with soft deletion
- Dashboard analytics (summary, charts, top categories, recent activity)

### AI Features

- AI-generated spending summaries
- Personalized saving recommendations
- Expense forecasting based on historical trends
- Uses aggregated financial data instead of raw transactions for efficiency and privacy

---

## Tech Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Zod (validation)
- JWT (authentication)
- Gemini API (AI features)

---

## Project Structure

```
src/
  config/         # Environment, DB, AI config
  middleware/     # Auth and error handling
  modules/
    auth/
    transactions/
    categories/
    dashboard/
    ai/
  routes/         # Route aggregation
  utils/          # JWT, hashing, helpers
```

---

## Architecture Overview

- Controller Layer: Handles request/response lifecycle
- Service Layer: Contains business logic
- Prisma Layer: Handles database access
- Middleware: Authentication, error handling
- AI Layer: Encapsulated Gemini integration

---

## API Overview

### Auth

- POST /auth/signup
- POST /auth/login
- POST /auth/logout
- GET /auth/me

### Transactions

- GET /transactions
- POST /transactions
- GET /transactions/:id
- DELETE /transactions/:id

### Categories

- GET /categories
- POST /categories
- DELETE /categories/:id

### Dashboard

- GET /dashboard/summary
- GET /dashboard/charts
- GET /dashboard/top-categories
- GET /dashboard/recent-activity

### AI

- GET /ai/spending-summary
- GET /ai/saving-recommendations
- GET /ai/forecast

---

## Key Design Decisions

- Normalized relational schema for consistency and scalability
- Transactional updates for financial correctness
- Soft deletion for categories to preserve historical integrity
- Aggregation at DB level for performance
- AI layer uses summarized data to reduce cost and improve reliability

---

## Setup Instructions

1. Clone the repository
2. Install dependencies
   npm install
3. Setup environment variables in .env
4. Run database migrations
   npx prisma migrate dev
5. Start development server
   npm run dev

---

## Environment Variables

- DATABASE_URL
- JWT_SECRET
- JWT_EXPIRES_IN
- GEMINI_API_KEY
- FRONTEND_URL

---

## Future Improvements

- Add refresh token-based authentication
- Implement rate limiting for auth and AI endpoints
- Introduce Redis caching for dashboard and AI responses
- Add unit and integration tests
- Add pagination and filtering for transactions
- Improve concurrency handling for wallet balance updates
- Migrate to containerized deployment (Docker + AWS)

---

## License

This project is for educational and portfolio purposes.
