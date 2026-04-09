# TCSS 460 Backend 2 — Messaging API

Express + TypeScript + PostgreSQL + Prisma ORM example API for TCSS 460.

This repo demonstrates two approaches to database access side by side:

- **v1 routes** — raw SQL queries with the `pg` driver
- **v2 routes** — Prisma ORM with type-safe queries

Both versions implement the same API contract (same endpoints, same request/response shapes). The difference is the data access layer.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd TCSS460-backend-2
npm install

# 2. Set up environment
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d

# 4. Run migrations and generate Prisma client
npx prisma migrate dev --name init
npx prisma generate

# 5. Seed the database
npm run prisma:seed

# 6. Start the dev server
npm run dev
```

Or use the all-in-one setup command:

```bash
cp .env.example .env
npm run db:setup
npm run dev
```

The server runs at **http://localhost:3000** with API docs at **http://localhost:3000/api-docs**.

## Scripts

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Start dev server with hot-reload               |
| `npm run build`           | Compile TypeScript to `dist/`                  |
| `npm start`               | Run compiled output                            |
| `npm test`                | Run test suite                                 |
| `npm run lint`            | Check for lint errors                          |
| `npm run lint:fix`        | Auto-fix lint errors                           |
| `npm run format`          | Format all files                               |
| `npm run format:check`    | Check formatting                               |
| `npm run prisma:migrate`  | Run database migrations                        |
| `npm run prisma:generate` | Regenerate Prisma client                       |
| `npm run prisma:seed`     | Seed the database                              |
| `npm run prisma:studio`   | Open Prisma Studio (visual DB browser)         |
| `npm run prisma:reset`    | Reset database (drops all data)                |
| `npm run db:setup`        | Full setup: Docker + migrate + generate + seed |

## API Endpoints

### Users

| Method | Route               | Description                  |
| ------ | ------------------- | ---------------------------- |
| GET    | `/v{1,2}/users`     | List users (paginated)       |
| GET    | `/v{1,2}/users/:id` | Get user with their messages |
| POST   | `/v{1,2}/users`     | Create a user                |

### Messages

| Method | Route                  | Description                           |
| ------ | ---------------------- | ------------------------------------- |
| GET    | `/v{1,2}/messages`     | List messages (paginated, filterable) |
| GET    | `/v{1,2}/messages/:id` | Get a message with author             |
| POST   | `/v{1,2}/messages`     | Create a message                      |
| PUT    | `/v{1,2}/messages/:id` | Full update a message                 |
| PATCH  | `/v{1,2}/messages/:id` | Partial update a message              |
| DELETE | `/v{1,2}/messages/:id` | Delete a message                      |

### Pagination

List endpoints accept `page` and `limit` query parameters:

```
GET /v2/messages?page=2&limit=10
```

v2 message listing also supports filtering and sorting:

```
GET /v2/messages?authorId=5&read=false&sort=createdAt&order=desc
```

## Project Structure

```
src/
├── index.ts              # Server startup
├── app.ts                # Express app configuration
├── pool.ts               # Raw pg Pool (v1 data layer)
├── prisma.ts             # Shared PrismaClient (v2 data layer)
├── controllers/
│   ├── v1/               # Raw SQL implementations
│   └── v2/               # Prisma implementations
├── middleware/
│   ├── logger.ts         # Request logging
│   ├── validation.ts     # Input validation
│   └── jwt.ts            # JWT middleware (prepared for Week 5)
└── routes/
    ├── v1/               # v1 route definitions
    └── v2/               # v2 route definitions
```

## Architecture Decisions

- **app.ts / index.ts split** — Enables Supertest to import the app without starting a server.
- **`@/` path aliases** — `@/controllers/v1/messages` instead of `../../../controllers/v1/messages`.
- **v1 vs v2** — Same API contract, different data access layer. v1 uses raw SQL to teach fundamentals; v2 uses Prisma to show the ORM advantage.
- **Pagination response format** — `{ data: [...], pagination: { page, limit, total, totalPages } }`.
