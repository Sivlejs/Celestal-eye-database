-- Celestal Eye Database Schema
-- Birth chart app backend database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Birth charts table
CREATE TABLE IF NOT EXISTS birth_charts (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Celestial events table (tracked planetary events, transits, etc.)
CREATE TABLE IF NOT EXISTS celestial_events (
    id              SERIAL PRIMARY KEY,
    event_name      VARCHAR(120) NOT NULL,
    event_type      VARCHAR(60),          -- e.g. 'transit', 'retrograde', 'eclipse'
    celestial_body  VARCHAR(60),          -- e.g. 'Mercury', 'Venus', 'Full Moon'
    event_date      TIMESTAMPTZ NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chart readings / interpretations
CREATE TABLE IF NOT EXISTS chart_readings (
    id              SERIAL PRIMARY KEY,
    birth_chart_id  INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
    reading_type    VARCHAR(60) NOT NULL, -- e.g. 'natal', 'transit', 'solar_return'
    content         TEXT NOT NULL,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_birth_charts_user_id  ON birth_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_readings_chart  ON chart_readings(birth_chart_id);
CREATE INDEX IF NOT EXISTS idx_celestial_events_date ON celestial_events(event_date);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_birth_charts_updated_at
    BEFORE UPDATE ON birth_charts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
