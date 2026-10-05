const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está configurada.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX || 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => console.error('PostgreSQL pool error:', err));

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
