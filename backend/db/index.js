const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err.message);
});

/**
 * connect() — retry until the DB is reachable (Render cold-start delay),
 * then apply schema.sql so tables always exist without a manual migration step.
 */
async function connect(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    let client;
    try {
      client = await pool.connect();
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await client.query(schema);
      console.log('PostgreSQL connected and schema applied.');
      return;
    } catch (err) {
      console.error(`DB attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    } finally {
      if (client) client.release();
    }
  }
}

module.exports = { query: (...args) => pool.query(...args), connect };

