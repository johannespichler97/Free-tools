/* ReconMatch persistence server.
 *
 * The matching engine, file parsing (PDF/CSV/XLSX) and the whole UI stay
 * exactly as they were — 100% client-side, unchanged, in index.html. This
 * server only adds durable storage on top of that: it serves the page and
 * exposes two small JSON endpoints so the browser's in-memory `state` +
 * `fxState` survive a reload and are shared by everyone with access,
 * instead of living only in one browser tab until it's closed.
 *
 * Storage model: a single JSONB blob (see ensureSchema below), not a
 * normalized relational schema. This is a deliberate simplification, not
 * an oversight — every Bank/PSP file has a different, dynamically
 * detected set of columns (Unipayment vs. Alphapo vs. Narvi's PDF layout
 * etc. all differ), which doesn't map cleanly onto fixed SQL columns
 * without a lot of ceremony that buys nothing yet. If reporting/querying
 * across historical data becomes a real need later, this is the piece to
 * revisit — the JSON shape itself (see index.html's `state`/`fxState`)
 * would translate reasonably directly into real tables at that point.
 */
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '25mb' })); // a day's worth of statements/matches, comfortably

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway's internal Postgres connection doesn't present a CA chain the
  // default `pg` verification trusts; this is the standard, safe-enough
  // relaxation for a private, same-project DB connection (not a public
  // internet-facing DB) — not a blanket "ignore all TLS" choice.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT app_state_singleton CHECK (id = 1)
    );
  `);
}

app.get('/api/state', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT data, updated_at FROM app_state WHERE id = 1');
    if (!rows.length) return res.json({ data: null, updatedAt: null });
    res.json({ data: rows[0].data, updatedAt: rows[0].updated_at });
  } catch (err) {
    console.error('GET /api/state failed:', err);
    res.status(500).json({ error: 'Konnte gespeicherten Stand nicht laden.' });
  }
});

app.put('/api/state', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO app_state (id, data, updated_at) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [req.body ?? {}]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/state failed:', err);
    res.status(500).json({ error: 'Konnte Stand nicht speichern.' });
  }
});

// Single page, fully self-contained (see index.html's own header comment)
// — no other static assets to serve, so no blanket express.static() that
// would otherwise also expose this file and package.json.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`ReconMatch server listening on :${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
