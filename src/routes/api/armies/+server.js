import { query } from '$lib/db.js';
import { jsonResponse } from '$lib/validation.js';

export async function GET() {
  const { rows } = await query(`
    SELECT name, subfactions, common_units AS "commonUnits"
    FROM armies
    ORDER BY name
  `);
  return jsonResponse(rows);
}
