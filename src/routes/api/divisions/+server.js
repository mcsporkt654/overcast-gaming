import { query, withDb } from '$lib/db.js';
import { errorResponse, jsonResponse, normalizeString } from '$lib/validation.js';

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export const GET = withDb(async ({ url }) => {
  const seasonId = normalizeOptionalId(url.searchParams.get('seasonId'));

  const params = [];
  let whereClause = '';
  if (seasonId) {
    params.push(seasonId);
    whereClause = `WHERE d.season_id = $${params.length}`;
  }

  const { rows } = await query(
    `SELECT
       d.id,
       d.season_id AS "seasonId",
       s.season_year AS "seasonYear",
       d.name
     FROM divisions d
     JOIN seasons s ON s.id = d.season_id
     ${whereClause}
     ORDER BY s.season_year DESC, CASE d.name WHEN 'Premier' THEN 0 ELSE 1 END, d.name`,
    params
  );

  return jsonResponse(rows);
});

export const POST = withDb(async ({ request, locals }) => {
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body.');

  const seasonId = normalizeOptionalId(body.seasonId);
  const name = normalizeString(body.name, 40);
  if (!seasonId) return errorResponse('seasonId is required.');
  if (!['Premier', 'Stump'].includes(name)) {
    return errorResponse('Division name must be Premier or Stump.');
  }

  const { rows: sRows } = await query(`SELECT id FROM seasons WHERE id = $1`, [seasonId]);
  if (!sRows.length) return errorResponse('seasonId does not match any known season.');

  const { rows } = await query(
    `INSERT INTO divisions (season_id, name)
     VALUES ($1, $2)
     ON CONFLICT (season_id, name) DO NOTHING
     RETURNING id, season_id AS "seasonId", name`,
    [seasonId, name]
  );

  if (!rows.length) {
    const { rows: existing } = await query(
      `SELECT id, season_id AS "seasonId", name FROM divisions WHERE season_id = $1 AND name = $2`,
      [seasonId, name]
    );
    return jsonResponse({ success: true, division: existing[0] });
  }

  return jsonResponse({ success: true, division: rows[0] }, 201);
});
