# BookNook API

Express + MongoDB REST API for the BookNook online library.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/books` | Public (`?latest=6` optional) |
| GET | `/books/:id` | Public |
| POST | `/books` | JWT |
| PATCH | `/books/:id` | JWT (owner) |
| DELETE | `/books/:id` | JWT (owner) |
| POST | `/borrows` | JWT |
| GET | `/borrows` | JWT |
| DELETE | `/borrows/:id` | JWT |

`GET /health` — health check for hosting (not counted in the assignment’s eight routes).

## Setup

1. Copy `.env.example` to `.env`.
2. `npm install`
3. `npm run dev` (development) or `npm run build && npm start`

## Environment

| Variable | Description |
|----------|-------------|
| `PORT` | Default `5000` |
| `MONGODB_URI` | Same database as Next.js BetterAuth |
| `JWT_SECRET` | **Must match** frontend `JWT_SECRET` |
| `CLIENT_ORIGIN` | Frontend origin for CORS — `http://localhost:3000` or Vercel URL |

Full wiring guide: [DEPLOYMENT.md](../DEPLOYMENT.md).

## Tests

```bash
npm run test:integration
```

Uses in-memory MongoDB; validates all eight routes, JWT, owner checks, borrow `$inc`, and duplicate borrow handling.

## Deploy (Render)

| Step | Command / value |
|------|------------------|
| Root directory | `backend` |
| Build | `npm install && npm run build` |
| Start | `npm start` |
| `CLIENT_ORIGIN` | Production frontend URL, e.g. `https://booknook.vercel.app` |

Give the public URL to the frontend as `NEXT_PUBLIC_API_URL`.
