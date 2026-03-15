# Celestal-eye-database
The database for the birth chart app

# Celestal Eye — Backend

Full backend for the **Celestal Eye** birth chart app.  
Provides a REST API for user authentication, birth chart storage, celestial event tracking, and chart readings, plus a live admin dashboard — all deployable to [Render](https://render.com) with one click.

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + Express 4 |
| Database | PostgreSQL 16 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Hosting | Render (Docker-based web service + managed PostgreSQL) |
| Local dev | Docker Compose |
| Dashboard | Vanilla HTML/CSS/JS (served by Express) |

---

## Project structure

```
.
├── render.yaml               # Render Blueprint — one-click deploy
├── docker-compose.yml        # Local development (Postgres + Adminer + backend)
├── .env.example              # Copy to .env and fill in values
└── backend/
    ├── Dockerfile
    ├── server.js             # Express entry point
    ├── db/
    │   ├── index.js          # Pool + auto-schema-apply on startup
    │   ├── schema.sql        # All table definitions
    │   └── seed.sql          # Sample data (runs in Docker only)
    ├── middleware/
    │   └── auth.js           # requireAuth / optionalAuth JWT middleware
    ├── routes/
    │   ├── auth.js           # /api/auth/*
    │   ├── users.js          # /api/users/*
    │   ├── charts.js         # /api/charts/*
    │   └── events.js         # /api/events/*
    └── public/               # Admin dashboard (static files)
        ├── index.html
        ├── css/style.css
        └── js/app.js
```

---

## Deploy to Render (recommended)

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Blueprint**.
3. Connect your GitHub repo — Render reads `render.yaml` automatically.
4. Click **Apply**. Render will create:
   - A managed **PostgreSQL** database (`celestal-eye-db`)
   - A **Docker web service** (`celestal-eye-backend`) with `DATABASE_URL` and a generated `JWT_SECRET` already wired in.
5. After the first deploy succeeds, set `ALLOWED_ORIGINS` in the service's **Environment** tab to your app's URL (e.g. `https://celestal-eye.app`).
6. Visit `https://<your-service>.onrender.com` to see the admin dashboard.

> **Schema**: tables are created automatically on every startup via `schema.sql` — no manual migration step needed.

---

## Local development

```bash
cp .env.example .env          # fill in JWT_SECRET
docker compose up --build     # starts Postgres, backend (:3000), Adminer (:8080)
```

- API: http://localhost:3000
- Dashboard: http://localhost:3000
- Adminer (DB GUI): http://localhost:8080 → server `postgres`, user/pass/db from `.env`

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Long random string used to sign tokens |
| `PORT` | — | HTTP port (default `3000`; Render sets this automatically) |
| `ALLOWED_ORIGINS` | — | Comma-separated allowed CORS origins. Leave blank to allow all. |

---

## API Reference

All responses are JSON. Protected routes require the header:
```
Authorization: Bearer <token>
```

---

### Authentication — `/api/auth`

#### `POST /api/auth/register`
Create a new account.

**Body**
```json
{ "name": "Alice", "email": "alice@example.com", "password": "s3cr3t!!" }
```
**Response `201`**
```json
{
  "user":  { "id": 1, "name": "Alice", "email": "alice@example.com", "created_at": "…" },
  "token": "<jwt>"
}
```

---

#### `POST /api/auth/login`
Log in and receive a token.

**Body**
```json
{ "email": "alice@example.com", "password": "s3cr3t!!" }
```
**Response `200`**
```json
{
  "user":  { "id": 1, "name": "Alice", "email": "alice@example.com", "created_at": "…" },
  "token": "<jwt>"
}
```

---

#### `GET /api/auth/me` 🔒
Get the current user's profile.

**Response `200`**
```json
{ "id": 1, "name": "Alice", "email": "alice@example.com", "created_at": "…", "updated_at": "…" }
```

---

#### `PATCH /api/auth/me` 🔒
Update name, email, and/or password. Provide at least one field.

**Body** (all fields optional)
```json
{ "name": "Alice Moon", "email": "new@example.com", "password": "newpass123" }
```
**Response `200`** — updated user object.

---

### Birth Charts — `/api/charts`

#### `GET /api/charts` 🔒 (optional)
- **With token** → returns only the authenticated user's charts.
- **Without token** → returns all charts (used by admin dashboard).

**Response `200`** — array of chart objects.

---

#### `POST /api/charts` 🔒
Create a birth chart for the authenticated user.

**Body**
```json
{
  "birth_date":    "1990-04-15",
  "birth_time":    "08:30:00",
  "birth_city":    "New York",
  "birth_country": "USA",
  "latitude":      40.712776,
  "longitude":    -74.005974,
  "sun_sign":     "Aries",
  "moon_sign":    "Scorpio",
  "rising_sign":  "Cancer",
  "chart_data":   { "aspects": ["Sun trine Moon"] }
}
```
**Response `201`** — created chart object.

---

#### `GET /api/charts/:id` 🔒 (optional)
Get a single chart with its readings.  
App users may only fetch their own chart; the dashboard may fetch any.

**Response `200`**
```json
{
  "id": 1,
  "user_name": "Alice",
  "birth_date": "1990-04-15",
  "sun_sign": "Aries",
  "readings": [
    { "id": 1, "reading_type": "natal", "content": "…", "generated_at": "…" }
  ]
}
```

---

#### `POST /api/charts/:id/readings` 🔒
Add a reading to one of the authenticated user's charts.

**Body**
```json
{ "reading_type": "natal", "content": "With the Sun in Aries…" }
```
**Response `201`** — created reading object.

---

#### `GET /api/charts/:id/readings` 🔒 (optional)
List all readings for a chart.

**Response `200`** — array of reading objects.

---

### Celestial Events — `/api/events`

#### `GET /api/events`
List all celestial events (public, sorted by date).

#### `GET /api/events/:id`
Get a single event.

#### `POST /api/events`
Add a celestial event.

**Body**
```json
{
  "event_name":    "Mercury Retrograde",
  "event_type":    "retrograde",
  "celestial_body":"Mercury",
  "event_date":   "2026-01-25T10:00:00Z",
  "description":  "Mercury stations retrograde in Aquarius."
}
```

---

### Admin — `/api/users`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all users (dashboard) |
| `GET` | `/api/users/:id` | User + their charts |
| `POST` | `/api/users` | Create user (no password — admin only) |

---

### Health check

`GET /health` → `{ "status": "ok", "timestamp": "…" }`  
Used by Render to confirm the service is running.

---

## Database schema

```
users               id, name, email, password_hash, created_at, updated_at
birth_charts        id, user_id→users, birth_date, birth_time, birth_city,
                    birth_country, latitude, longitude, sun_sign, moon_sign,
                    rising_sign, chart_data (JSONB), created_at, updated_at
chart_readings      id, birth_chart_id→birth_charts, reading_type, content, generated_at
celestial_events    id, event_name, event_type, celestial_body, event_date, description, created_at
```

