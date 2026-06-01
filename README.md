# TrackBud Backend

TrackBud is a TypeScript and Express backend for a personal finance application. It supports transaction tracking, dashboard analytics, Redis caching, structured Gemini insights, and BullMQ-powered monthly financial reviews.

The backend MVP is feature-complete for its current scope. Production deployment and operational verification are in progress.

## Live Demo

- Frontend: [https://track-bud-frontend.vercel.app/](https://track-bud-frontend.vercel.app/)
- Backend API: Deployed on Render

## Highlights

- Layered Express architecture with routes, controllers, and services
- Prisma and PostgreSQL relational model with user-owned financial data
- Transactional wallet balance updates using atomic increments and decrements
- Cursor-based pagination and bounded dashboard queries
- Database-backed analytics with parameterized raw SQL where needed
- Optional Redis caching with PostgreSQL fallback
- In-process rate limiting for global, auth, write-heavy, dashboard, and AI routes
- Zod request, environment, and AI-output validation
- Centralized error handling with production-safe responses
- Structured Gemini insights based on aggregated financial data
- BullMQ monthly-review queue with a separate worker process
- Docker Compose development stack for API, worker, PostgreSQL, and Redis

## Features

### Authentication

- Signup, login, logout, and current-user endpoints
- JWT access token stored in an HTTP-only cookie
- Password hashing with `bcryptjs`
- Default wallet and categories created during signup
- CORS, Helmet headers, and auth-route rate limits

### Transactions

- Create, retrieve, update, and delete income or expense records
- Atomic wallet balance maintenance inside Prisma transactions
- Update flow that reverses the old balance impact before applying the new one
- Cursor pagination with capped page size
- Optional date-range and transaction-kind filters
- User-scoped ownership checks

### Categories

- List active categories
- Create user-owned custom categories
- Archive custom categories without breaking historical transactions
- Protect default categories from archival

### Dashboard Analytics

- Income, expense, balance, and transaction-count summary
- Expense totals by category
- Income and expense totals by month
- Top expense categories
- Recent activity
- Redis caching for summary and chart responses

### AI Insights

- Spending summaries
- Saving recommendations
- Expense forecasts
- Compact aggregated prompt data instead of raw transaction dumps
- Gemini JSON response schemas with Zod validation
- Redis caching for repeated AI reads

### Monthly AI Review Jobs

- Asynchronous BullMQ queue backed by Redis
- Separate worker process for long-running review generation
- Review of the previous completed calendar month
- Deterministic backend aggregation before Gemini interpretation
- PostgreSQL status and result persistence
- Duplicate prevention for the same user and review period
- Retry handling with exponential backoff
- Explicit `INSUFFICIENT_DATA` and `FAILED` states

### Infrastructure and Reliability

- PostgreSQL as the source of truth
- Redis cache failures degrade to database-backed reads
- BullMQ retry-aware monthly-review status transitions
- Graceful shutdown for API and worker processes
- Startup environment validation
- API health endpoint
- Docker health checks for PostgreSQL and Redis

## Tech Stack

| Area             | Technology                                 |
| ---------------- | ------------------------------------------ |
| Runtime          | Node.js                                    |
| Web framework    | Express                                    |
| Language         | TypeScript                                 |
| Database         | PostgreSQL                                 |
| ORM              | Prisma                                     |
| Cache            | Redis with `redis`                         |
| Background jobs  | BullMQ                                     |
| Validation       | Zod                                        |
| Authentication   | JWT, `bcryptjs`, HTTP-only cookies         |
| AI provider      | Google Gemini through `@google/genai`      |
| HTTP middleware  | Helmet, CORS, Morgan, `express-rate-limit` |
| Containerization | Docker and Docker Compose                  |

## Architecture

### Synchronous API Flow

```text
Client
  -> Express app and middleware
  -> Routes
  -> Controllers
  -> Services
  -> Prisma
  -> PostgreSQL
```

### Asynchronous Monthly Review Flow

```text
Client
  -> Monthly review API
  -> PostgreSQL MonthlyReview row
  -> BullMQ queue in Redis
  -> Separate worker process
  -> Financial aggregation
  -> Gemini structured interpretation
  -> PostgreSQL MonthlyReview result
```

Redis supports optional API caching and BullMQ infrastructure. Rate limiting currently uses the default in-process `express-rate-limit` store.

## Project Structure

```text
src/
  app.ts                         # Express app, middleware, routes, health endpoint
  server.ts                      # API process startup and graceful shutdown
  worker.ts                      # BullMQ worker process entrypoint
  config/
    bullmq.ts                    # BullMQ Redis connection
    db.ts                        # Prisma client
    env.ts                       # Environment validation
    gemini.ts                    # Structured Gemini helper
    redis.ts                     # Optional API cache client
  jobs/
    monthlyReview.job.ts
    queues/
      monthlyReview.queue.ts
    workers/
      monthlyReview.worker.ts
  middleware/
    authMiddleware.ts
    errorHandler.ts
    rateLimitMiddleware.ts
  modules/
    auth/
    categories/
    transactions/
    dashboard/
    ai/
      monthlyReview/
  routes/
    index.ts
  utils/
prisma/
  schema.prisma
  migrations/
Dockerfile
docker-compose.yml
```

## API Overview

All versioned API routes are mounted under `/api/v1`.

| Area         | Method   | Route                               | Purpose                               |
| ------------ | -------- | ----------------------------------- | ------------------------------------- |
| Auth         | `POST`   | `/api/v1/auth/signup`               | Create an account                     |
| Auth         | `POST`   | `/api/v1/auth/login`                | Authenticate                          |
| Auth         | `POST`   | `/api/v1/auth/logout`               | Clear the auth cookie                 |
| Auth         | `GET`    | `/api/v1/auth/me`                   | Get the current user                  |
| Categories   | `GET`    | `/api/v1/categories`                | List active categories                |
| Categories   | `POST`   | `/api/v1/categories`                | Create a category                     |
| Categories   | `DELETE` | `/api/v1/categories/:id`            | Archive a category                    |
| Transactions | `GET`    | `/api/v1/transactions`              | List filtered, paginated transactions |
| Transactions | `GET`    | `/api/v1/transactions/:id`          | Get one transaction                   |
| Transactions | `POST`   | `/api/v1/transactions`              | Create a transaction                  |
| Transactions | `PATCH`  | `/api/v1/transactions/:id`          | Update a transaction                  |
| Transactions | `DELETE` | `/api/v1/transactions/:id`          | Delete a transaction                  |
| Dashboard    | `GET`    | `/api/v1/dashboard/summary`         | Get totals and balance                |
| Dashboard    | `GET`    | `/api/v1/dashboard/charts`          | Get chart data                        |
| Dashboard    | `GET`    | `/api/v1/dashboard/top-categories`  | Get top expense categories            |
| Dashboard    | `GET`    | `/api/v1/dashboard/recent-activity` | Get recent transactions               |
| AI           | `GET`    | `/api/v1/ai/spending-summary`       | Generate spending insights            |
| AI           | `GET`    | `/api/v1/ai/saving-recommendations` | Generate saving recommendations       |
| AI           | `GET`    | `/api/v1/ai/forecast`               | Generate an expense forecast          |
| AI           | `POST`   | `/api/v1/ai/monthly-review`         | Queue a monthly review                |
| AI           | `GET`    | `/api/v1/ai/monthly-review/current` | Get the current review state          |
| AI           | `GET`    | `/api/v1/ai/monthly-review/:id`     | Get a review by ID                    |

The application also exposes `GET /health` for basic process health.

## Database Design

| Model           | Responsibility                                                       |
| --------------- | -------------------------------------------------------------------- |
| `User`          | Account identity, password hash, and default currency                |
| `Wallet`        | User-owned wallet with stored `Decimal(14, 2)` balance               |
| `Category`      | User-owned category with default and archived states                 |
| `Transaction`   | Income or expense record linked to a wallet and category             |
| `MonthlyReview` | Async review status, comparison period, result, and failure metadata |

Important schema choices:

- Money values use PostgreSQL decimal fields.
- Categories are archived rather than physically deleted.
- Composite foreign keys ensure transaction wallets and categories belong to the same user.
- Indexes support transaction date filters, dashboard aggregation, category lookups, and monthly-review queries.
- Monthly-review status and structured JSON results are persisted in PostgreSQL.

## Key Backend Design Decisions

- Store wallet balance for fast reads while updating it transactionally.
- Use atomic database increments and decrements instead of read-modify-write updates.
- Enforce ownership in service queries and transaction relationships.
- Run dashboard aggregation in PostgreSQL.
- Treat Redis as an optional cache layer for API reads with graceful fallback.
- Send aggregated finance data to Gemini instead of raw transaction dumps.
- Use BullMQ for monthly AI work that should not block request handling.
- Run API, worker, PostgreSQL, and Redis as separate Docker Compose services.

## Local Development

Docker Compose is the recommended local development workflow.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd track-bud-backend
```

### 2. Create the Docker Environment File

```bash
cp .env.docker.example .env.docker
```

Fill in local secrets such as `JWT_SECRET` and `GEMINI_API_KEY`.

### 3. Start the Stack

```bash
docker compose --env-file .env.docker up --build
```

The stack starts four services:

- `backend`: Express API
- `worker`: BullMQ monthly-review worker
- `postgres`: PostgreSQL database
- `redis`: Redis cache and BullMQ infrastructure

### 4. Run Development Migrations

```bash
docker compose --env-file .env.docker exec backend npx prisma migrate dev
```

### 5. Optional: Open Prisma Studio

```bash
docker compose --env-file .env.docker exec backend npx prisma studio
```

### 6. View Logs

```bash
docker compose --env-file .env.docker logs -f backend
docker compose --env-file .env.docker logs -f worker
```

### 7. Stop the Stack

```bash
docker compose --env-file .env.docker down
```

To remove local PostgreSQL and Redis volumes:

```bash
docker compose --env-file .env.docker down -v
```

Use `down -v` carefully because it deletes local development data.

## Environment Variables

### Backend Runtime

| Variable                | Notes                                           |
| ----------------------- | ----------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string required by Prisma |
| `JWT_SECRET`            | JWT signing secret; minimum 32 characters       |
| `GEMINI_API_KEY`        | Gemini API key                                  |
| `REDIS_URL`             | Redis connection used by caching and BullMQ     |
| `CACHE_ENABLED`         | Enables optional Redis API caching              |
| `FRONTEND_URL`          | Allowed CORS origin                             |
| `NODE_ENV`              | `development`, `production`, or `test`          |
| `PORT`                  | API port; hosting platforms may provide this    |
| `JWT_EXPIRES_IN`        | JWT expiry duration                             |
| `JWT_COOKIE_MAX_AGE_MS` | Optional cookie lifetime override               |

### Docker Compose

| Variable            | Notes                                        |
| ------------------- | -------------------------------------------- |
| `POSTGRES_USER`     | Local PostgreSQL user                        |
| `POSTGRES_PASSWORD` | Local PostgreSQL password                    |
| `POSTGRES_DB`       | Local PostgreSQL database                    |
| `POSTGRES_PORT`     | Optional local PostgreSQL port configuration |
| `REDIS_PORT`        | Optional local Redis port configuration      |
| `BACKEND_PORT`      | Host port mapped to the API container        |

Use `.env.example` for host-based development and `.env.docker.example` for Docker Compose. Do not commit real secrets.

## Useful Commands

| Command                     | Purpose                              |
| --------------------------- | ------------------------------------ |
| `npm run dev`               | Start the API development process    |
| `npm run dev:worker`        | Start the worker development process |
| `npm run build`             | Compile TypeScript                   |
| `npm run start`             | Start the compiled API process       |
| `npm run start:worker`      | Start the compiled worker process    |
| `npx prisma generate`       | Generate Prisma Client               |
| `npx prisma migrate dev`    | Apply development migrations         |
| `npx prisma migrate deploy` | Apply production migrations          |
| `npm run prisma:studio`     | Open Prisma Studio                   |

## Production Notes

The repository includes a production Docker stage, but deployment still requires production verification.

- Run both the API process and the separate worker process.
- Provision PostgreSQL.
- Provision Redis for BullMQ and optional API caching.
- Provide secrets through the hosting platform's secret manager.
- Build with `npm run build`.
- Start the API with `npm run start`.
- Start the worker with `npm run start:worker`.
- Apply production migrations with `npx prisma migrate deploy`.
- Use `/health` for basic API process health checks.
- Capture logs for both the API and worker processes.
- Do not use `prisma migrate dev` in production.

## Current Scope and Limitations

- The backend MVP is feature-complete for the current scope.
- Automated tests are not included in the current scope.
- Deployment, logs, and monitoring still need production verification.
- The `/health` endpoint reports basic API process availability only.
- Rate limiting uses an in-process store and is not shared across horizontally scaled API instances.
- The Docker image uses Node.js 22 while `package.json` currently declares Node.js 20.
- Refresh-token rotation and audit logging are not implemented.
- Large-scale architecture such as read replicas and event-driven processing is intentionally deferred.

## Documentation

- [Backend Technical Documentation](./TrackBud_Backend_Technical_Documentation.md)
- [Backend Development Plan](./TrackBud_Backend_Development_Plan.md)

## License

This project is for educational and portfolio purposes.
