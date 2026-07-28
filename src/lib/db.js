import pg from 'pg';
const { Pool } = pg;

let pool;
let outageStartedAt = 0;
let lastOutageLogAt = 0;
const OUTAGE_LOG_INTERVAL_MS = 30_000;

export class DatabaseUnavailableError extends Error {
  constructor(message = 'Database is currently unavailable.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
    this.status = 503;
  }
}

/** @param {unknown} error */
function errorCode(error) {
  if (!error || typeof error !== 'object') return '';
  return String(/** @type {{ code?: string }} */ (error).code || '');
}

/** @param {unknown} error */
function logOutage(error) {
  const now = Date.now();
  if (!outageStartedAt) {
    outageStartedAt = now;
    lastOutageLogAt = 0;
  }

  if (now - lastOutageLogAt < OUTAGE_LOG_INTERVAL_MS) return;

  const outageSeconds = Math.max(1, Math.floor((now - outageStartedAt) / 1000));
  console.error(`[db-health] unavailable for ${outageSeconds}s`, {
    code: errorCode(error)
  });
  lastOutageLogAt = now;
}

function logRecovery() {
  if (!outageStartedAt) return;
  const outageSeconds = Math.max(1, Math.floor((Date.now() - outageStartedAt) / 1000));
  console.info(`[db-health] connection recovered after ${outageSeconds}s`);
  outageStartedAt = 0;
  lastOutageLogAt = 0;
}

/** @param {unknown} error */
export function isDatabaseConnectionError(error) {
  if (!error || typeof error !== 'object') return false;

  const err = /** @type {{ code?: string; message?: string }} */ (error);
  const code = String(err.code || '');
  const message = String(err.message || '').toLowerCase();

  if (code.startsWith('08')) return true; // Postgres connection exceptions
  if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EHOSTUNREACH', 'ETIMEDOUT'].includes(code)) {
    return true;
  }

  return (
    message.includes('database_url') ||
    message.includes('connect') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('server closed the connection')
  );
}

/**
 * Lazily initialize the connection pool so the module is importable at
 * build time without DATABASE_URL being set.
 */
function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    const error = new DatabaseUnavailableError('DATABASE_URL environment variable is required.');
    logOutage(error);
    throw error;
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
  try {
    const result = await getPool().query(text, params);
    logRecovery();
    return result;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError || isDatabaseConnectionError(error)) {
      logOutage(error);
      throw new DatabaseUnavailableError();
    }
    throw error;
  }
}

/**
 * Acquire a client for multi-statement transactions.
 */
export function getClient() {
  return getPool()
    .connect()
    .then((client) => {
      logRecovery();
      return client;
    })
    .catch((error) => {
      if (error instanceof DatabaseUnavailableError || isDatabaseConnectionError(error)) {
        logOutage(error);
        throw new DatabaseUnavailableError();
      }
      throw error;
    });
}

/**
 * Wrap a +server.js handler so a DatabaseUnavailableError (or a raw
 * connection-level pg error that slips through) becomes a real 503
 * response with Retry-After, instead of the generic 500 SvelteKit
 * produces for any other unexpected error.
 * @param {(event: import('@sveltejs/kit').RequestEvent) => Promise<Response>} handler
 */
export function withDb(handler) {
  return async (event) => {
    try {
      return await handler(event);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError || isDatabaseConnectionError(error)) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again shortly.' }),
          { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '30' } }
        );
      }
      throw error;
    }
  };
}

export default { query, getClient, withDb };
