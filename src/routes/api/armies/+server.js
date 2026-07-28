import { query, withDb } from '$lib/db.js';
import { jsonResponse } from '$lib/validation.js';

export const GET = withDb(async () => {
  const { rows } = await query(`
    SELECT name, subfactions, common_units AS "commonUnits"
    FROM armies
    ORDER BY name
  `);
  return jsonResponse(rows);
});
