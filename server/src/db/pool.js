import pkg from 'pg';

import config from '../config/index.js';

const { Pool } = pkg;

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database
});

pool.on('error', (err) => {
  console.error('[pg] Unexpected error on idle client', err);
});

export async function healthCheck() {
  const { rows } = await pool.query('SELECT 1 as ok');
  return rows[0]?.ok === 1;
}
