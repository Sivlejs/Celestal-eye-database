-- Seed data for development / demo purposes

-- Sample users
INSERT INTO users (name, email) VALUES
    ('Alice Moon',   'alice@example.com'),
    ('Bob Star',     'bob@example.com'),
    ('Carol Nebula', 'carol@example.com')
ON CONFLICT (email) DO NOTHING;

-- Sample birth charts
INSERT INTO birth_charts
    (user_id, birth_date, birth_time, birth_city, birth_country, latitude, longitude,
     sun_sign, moon_sign, rising_sign, chart_data)
VALUES
    (1, '1990-04-15', '08:30:00', 'New York',   'USA',    40.712776, -74.005974,
     'Aries',   'Scorpio', 'Cancer',
     '{"aspects": ["Sun trine Moon", "Mars square Venus"]}'::jsonb),

    (2, '1985-11-03', '14:15:00', 'Los Angeles','USA',    34.052235, -118.243683,
     'Scorpio', 'Gemini',  'Pisces',
     '{"aspects": ["Moon conjunct Jupiter", "Saturn sextile Neptune"]}'::jsonb),

    (3, '2000-06-21', '00:01:00', 'London',     'UK',     51.507351, -0.127758,
     'Cancer',  'Taurus',  'Aries',
     '{"aspects": ["Sun conjunct Moon", "Venus trine Mars"]}'::jsonb)
ON CONFLICT DO NOTHING;

-- Sample celestial events
INSERT INTO celestial_events (event_name, event_type, celestial_body, event_date, description)
VALUES
    ('Mercury Retrograde', 'retrograde', 'Mercury',
     '2026-01-25 10:00:00+00',
     'Mercury stations retrograde in Aquarius – expect communication delays.'),

    ('Full Moon in Virgo', 'lunar_phase', 'Moon',
     '2026-02-12 23:53:00+00',
     'Full Moon in Virgo – a time for health, routines, and practical magic.'),

    ('Total Solar Eclipse', 'eclipse', 'Sun',
     '2026-08-12 17:47:00+00',
     'Total solar eclipse visible across parts of Europe and Africa.')
ON CONFLICT DO NOTHING;

-- Sample chart readings
INSERT INTO chart_readings (birth_chart_id, reading_type, content)
VALUES
    (1, 'natal',
     'With the Sun in Aries and Moon in Scorpio, you carry both fiery initiative and deep emotional intensity.'),
    (2, 'transit',
     'Current Jupiter transit through your 1st house brings expansion and new beginnings.'),
    (3, 'solar_return',
     'This solar return year highlights partnerships and creative expression with Venus prominent.')
ON CONFLICT DO NOTHING;
