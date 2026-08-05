# OncoTrace AI — Server

Backend foundation for the OncoTrace AI precision oncology platform.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 20.0.0 |
| npm | ≥ 10.0.0 |
| PostgreSQL | ≥ 15 |

---

## First-Time Setup

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in real values:

- **DATABASE_URL** — PostgreSQL connection string
- **JWT_SECRET** — Generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Create the database

```sql
CREATE USER oncotrace_user WITH ENCRYPTED PASSWORD 'your_strong_password';
CREATE DATABASE oncotrace_db OWNER oncotrace_user;
GRANT ALL PRIVILEGES ON DATABASE oncotrace_db TO oncotrace_user;
```

### 4. Run migrations

```bash
npm run db:migrate:dev
```

### 5. Start the development server

```bash
npm run dev
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot-reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled production build |
| `npm run start:prod` | Run production build with NODE_ENV=production |
| `npm run type-check` | TypeScript type-check without emitting |
| `npm run lint` | ESLint static analysis |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier formatting |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate:dev` | Run migrations in development |
| `npm run db:migrate:prod` | Deploy migrations in production |
| `npm run db:reset` | Reset database (⚠️ destroys all data) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run clean` | Remove compiled output |

---

## Project Structure

```
src/
├── auth/           # Authentication domain (controllers, services, routes)
├── config/         # Environment, CORS, JWT configuration
├── lib/            # Shared infrastructure (Prisma singleton)
├── middleware/     # Express middleware (auth, RBAC, rate limiting, errors)
├── services/       # Cross-domain services (audit logging)
├── types/          # TypeScript type definitions and Express augmentations
├── utils/          # Reusable utilities (response builder, async handler, logger)
├── app.ts          # Express app factory
└── server.ts       # Entry point — connects DB, binds port, handles signals
```

---

## API Response Contract

Every response follows this envelope:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {},
  "timestamp": "2026-07-23T06:00:00.000Z"
}
```

Error response:

```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": { "field": ["validation message"] },
  "timestamp": "2026-07-23T06:00:00.000Z"
}
```

---

## Health Check

```
GET /health
```

Returns `200 OK` with service status. No authentication required.

---

## Security Notes

- JWT secrets must be ≥ 64 characters (enforced at startup)
- Passwords are hashed with **Argon2id** (memory: 64MB, time: 3, parallelism: 4)
- Auth endpoints are rate-limited to **10 requests per 15 minutes**
- CORS origin allowlist is explicitly configured — wildcard `*` is never used
- All request bodies are limited to **10KB** (prevents large-payload DoS)
- Sensitive data (passwords, tokens, cookies) is **never logged**
- Stack traces are **never exposed** in production responses

---

## Production Deployment

```bash
npm run build
NODE_ENV=production npm run db:migrate:prod
npm run start:prod
```

> For multi-instance deployments, replace the in-memory rate-limit store with Redis using `rate-limit-redis`.
