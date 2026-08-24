import { query, withDb } from '$lib/db.js';
import { errorResponse, jsonResponse, normalizeString } from '$lib/validation.js';

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export const GET = withDb(async () => {
  const { rows } = await query(
    `SELECT id, season_year AS "seasonYear", label
     FROM seasons
     ORDER BY season_year DESC`
  );
  return jsonResponse(rows);
});

export const POST = withDb(async ({ request, locals }) => {
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body.');

  const seasonYear = normalizeOptionalId(body.seasonYear);
  if (!seasonYear || seasonYear < 2000 || seasonYear > 2200) {
    return errorResponse('seasonYear must be a valid year.');
  }

  const label = normalizeString(body.label || `Season ${seasonYear}`, 80);
  const { rows } = await query(
    `INSERT INTO seasons (season_year, label)
     VALUES ($1, $2)
     ON CONFLICT (season_year)
     DO UPDATE SET label = EXCLUDED.label
     RETURNING id, season_year AS "seasonYear", label`,
    [seasonYear, label]
  );

  const season = rows[0];
  await query(
    `INSERT INTO divisions (season_id, name)
     VALUES ($1, 'Premier'), ($1, 'Stump')
     ON CONFLICT (season_id, name) DO NOTHING`,
    [season.id]
  );

  return jsonResponse({ success: true, season }, 201);
});
