import pg from 'pg';
const { Pool } = pg;

let pool;

/**
 * Lazily initialize the connection pool so the module is importable at
 * build time without DATABASE_URL being set.
 */
function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required.');
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render Postgres requires SSL; skip cert verification for their managed service.
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  return pool;
}

/**
 * Run a parameterized query and return rows.
 * @param {string} text
 * @param {unknown[]} [params]
 */
export async function query(text, params) {
  const result = await getPool().query(text, params);
  return result;
}

/**
 * Acquire a client for multi-statement transactions.
 */
export function getClient() {
  return getPool().connect();
}

export default { query, getClient };
