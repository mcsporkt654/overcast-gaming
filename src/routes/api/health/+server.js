import { query, withDb } from '$lib/db.js';
import { jsonResponse } from '$lib/validation.js';

export const GET = withDb(async () => {
  await query('SELECT 1');
  return jsonResponse({ status: 'ok' });
});
