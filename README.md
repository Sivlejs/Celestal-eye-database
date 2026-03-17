# Celestal-eye-database
The database for the birth chart app

## Database Status 🗄️

✅ **Database is deployed and connected on Render.com**

- **PGHero Dashboard**: https://pghero-dpg-d6r4ld6a2pns73aak9s0-a.onrender.com/
- Tables auto-created on startup: `users`, `birth_charts`, `chart_readings`, `celestial_events`

---

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
| `PAYPAL_CLIENT_ID` | — | PayPal Client ID for payments (see PayPal Setup below) |
| `PAYPAL_CLIENT_SECRET` | — | PayPal Client Secret for server-side verification |
| `PAYPAL_PLAN_ID` | — | PayPal subscription plan ID for premium subscriptions |

---

## PayPal Integration Setup

The Celestal Eye app supports two payment options via PayPal:
- **One-time payment** ($19.99) — Birth chart reading only
- **Monthly subscription** ($9.99/month) — Daily guide + Nexus AI access

### Setting Up PayPal

1. **Create a PayPal Developer Account**
   - Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
   - Log in with your PayPal account or create one

2. **Create a Sandbox App (for testing)**
   - Navigate to **Apps & Credentials**
   - Click **Create App**
   - Name it "Celestal Eye" (or similar)
   - Copy the **Client ID** and **Secret**

3. **Create a Subscription Plan (for Premium)**
   - Go to [PayPal Billing Plans](https://www.paypal.com/billing/plans)
   - Create a new subscription plan:
     - **Product**: Create a product called "Celestal Eye Premium"
     - **Plan name**: "Monthly Premium"
     - **Billing cycle**: Monthly
     - **Price**: $9.99 USD
   - Copy the **Plan ID** (starts with `P-`)

4. **Configure Environment Variables**
   Add these to your `.env` file or Render environment:
   ```
   PAYPAL_CLIENT_ID=your_client_id_here
   PAYPAL_CLIENT_SECRET=your_secret_here
   PAYPAL_PLAN_ID=P-your_plan_id_here
   ```

5. **For Production**
   - Switch from Sandbox to Live credentials
   - Create a live subscription plan
   - Update environment variables with live credentials

### Payment Pages

- **Pricing Page**: `/pricing.html` — Shows both payment options
- **Birth Chart Page**: `/birth-chart.html` — Dedicated page for one-time birth chart purchase

### Testing Payments

Use PayPal sandbox accounts to test:
1. Go to [Sandbox Accounts](https://developer.paypal.com/dashboard/accounts)
2. Use the generated buyer/seller accounts for testing
3. Payments in sandbox mode don't charge real money

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

### Payments — `/api/payments`

#### `GET /api/payments/products`
List available products and their prices.

**Response `200`**
```json
{
  "one_time": {
    "birth_chart": {
      "name": "Birth Chart Reading",
      "description": "One-time purchase for your personalized astrological birth chart",
      "price": "19.99",
      "currency": "USD"
    }
  },
  "subscription": {
    "premium": {
      "name": "Premium Subscription",
      "description": "Monthly subscription for daily guide and Nexus AI access",
      "price": "9.99",
      "currency": "USD",
      "interval": "MONTH"
    }
  }
}
```

---

#### `GET /api/payments/config`
Get PayPal client ID for frontend SDK.

**Response `200`**
```json
{
  "clientId": "your-paypal-client-id",
  "planId": "P-subscription-plan-id",
  "currency": "USD"
}
```

---

#### `POST /api/payments/create-order` 🔒
Create a one-time payment order.

**Body**
```json
{ "product_type": "birth_chart" }
```
**Response `200`**
```json
{
  "purchase_id": 1,
  "product": { "name": "Birth Chart Reading", "price": "19.99" },
  "amount": "19.99",
  "currency": "USD"
}
```

---

#### `POST /api/payments/capture-order` 🔒
Capture payment after PayPal approval.

**Body**
```json
{
  "purchase_id": 1,
  "paypal_order_id": "PAYPAL_ORDER_ID"
}
```
**Response `200`**
```json
{
  "success": true,
  "purchase": { "id": 1, "status": "completed", "..." },
  "message": "Payment completed successfully!"
}
```

---

#### `POST /api/payments/create-subscription` 🔒
Start a subscription process.

**Response `200`**
```json
{
  "subscription_id": 1,
  "plan": { "name": "Premium Subscription", "price": "9.99" }
}
```

---

#### `POST /api/payments/activate-subscription` 🔒
Activate subscription after PayPal approval.

**Body**
```json
{
  "subscription_id": 1,
  "paypal_subscription_id": "I-SUBSCRIPTION_ID"
}
```
**Response `200`**
```json
{
  "success": true,
  "subscription": { "id": 1, "status": "active", "..." },
  "message": "Subscription activated!"
}
```

---

#### `GET /api/payments/access` 🔒
Check user's access level based on purchases/subscriptions.

**Response `200`**
```json
{
  "hasBirthChartAccess": true,
  "hasDailyGuideAccess": false,
  "hasNexusAIAccess": false,
  "isPremium": false
}
```

---

#### `GET /api/payments/my-purchases` 🔒
Get user's purchase history.

#### `GET /api/payments/my-subscription` 🔒
Get user's current subscription status.

#### `POST /api/payments/cancel-subscription` 🔒
Cancel active subscription.

---

### Health check

`GET /health` → `{ "status": "ok", "timestamp": "…" }`  
Used by Render to confirm the service is running.

---

## Database schema

The database tracks everything needed for the Celestal Eye app:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **users** | User accounts | `id`, `name`, `email`, `password_hash`, timestamps |
| **birth_charts** | Birth chart data | `user_id` (FK), `birth_date`, `birth_time`, location, zodiac signs, `chart_data` (JSONB) |
| **chart_readings** | Interpretations | `birth_chart_id` (FK), `reading_type`, `content` |
| **celestial_events** | Planetary events | `event_name`, `event_type`, `celestial_body`, `event_date` |
| **subscriptions** | Monthly subscriptions | `user_id` (FK), `paypal_subscription_id`, `plan_type`, `status` |
| **purchases** | One-time purchases | `user_id` (FK), `paypal_order_id`, `product_type`, `amount`, `status` |

### Detailed Schema

```sql
-- Users table (stores email, name, encrypted passwords)
users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),           -- bcrypt hashed
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
)

-- Birth charts linked to users
birth_charts (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    birth_date      DATE NOT NULL,
    birth_time      TIME,
    birth_city      VARCHAR(120),
    birth_country   VARCHAR(80),
    latitude        NUMERIC(9, 6),
    longitude       NUMERIC(9, 6),
    sun_sign        VARCHAR(30),
    moon_sign       VARCHAR(30),
    rising_sign     VARCHAR(30),
    chart_data      JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
)

-- Readings/interpretations for charts
chart_readings (
    id              SERIAL PRIMARY KEY,
    birth_chart_id  INTEGER REFERENCES birth_charts(id) ON DELETE CASCADE,
    reading_type    VARCHAR(60) NOT NULL,   -- 'natal', 'transit', 'solar_return'
    content         TEXT NOT NULL,
    generated_at    TIMESTAMPTZ DEFAULT NOW()
)

-- Celestial events (retrogrades, eclipses, etc.)
celestial_events (
    id              SERIAL PRIMARY KEY,
    event_name      VARCHAR(120) NOT NULL,
    event_type      VARCHAR(60),            -- 'retrograde', 'eclipse', 'transit'
    celestial_body  VARCHAR(60),            -- 'Mercury', 'Venus', 'Moon'
    event_date      TIMESTAMPTZ NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

---

## Verifying Your Database

To verify your database is working on Render:

1. **Check the health endpoint**:
   ```bash
   curl https://<your-service>.onrender.com/health
   # Should return: { "status": "ok", "timestamp": "..." }
   ```

2. **View the dashboard**: Visit your service URL to see the admin dashboard with live data.

3. **Monitor with PGHero**: Access PGHero at your dashboard URL to view queries, indexes, and database health.

