import { query, withDb } from '$lib/db.js';
import { errorResponse, jsonResponse } from '$lib/validation.js';

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

export const GET = withDb(async ({ url }) => {
  const seasonId = normalizeOptionalId(url.searchParams.get('seasonId'));
  if (!seasonId) return errorResponse('seasonId is required.');

  const { rows } = await query(
    `SELECT
       spd.player_id AS "playerId",
       p.slug AS "playerSlug",
       p.name AS "playerName",
       spd.division_id AS "divisionId",
       d.name AS "divisionName",
       spd.source
     FROM season_player_divisions spd
     JOIN players p ON p.id = spd.player_id
     JOIN divisions d ON d.id = spd.division_id
     WHERE spd.season_id = $1
     ORDER BY p.name`,
    [seasonId]
  );

  return jsonResponse(rows);
});
