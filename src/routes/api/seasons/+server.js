import { query, withDb } from '$lib/db.js';
import { errorResponse, jsonResponse, normalizeString } from '$lib/validation.js';

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeOptionalBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const str = String(value).trim().toLowerCase();
  return str === '1' || str === 'true' || str === 'yes' || str === 'on';
}

/** @param {number} seasonId */
async function ensureSeasonDivisions(seasonId) {
  await query(
    `INSERT INTO divisions (season_id, name)
     VALUES ($1, 'Premier'), ($1, 'Stump')
     ON CONFLICT (season_id, name) DO NOTHING`,
    [seasonId]
  );

  const { rows } = await query(
    `SELECT id, name FROM divisions
     WHERE season_id = $1
     ORDER BY CASE name WHEN 'Premier' THEN 0 ELSE 1 END`,
    [seasonId]
  );
  return rows;
}

/**
 * @param {number} fromSeasonId
 * @param {number} toSeasonId
 */
async function applySeasonRollover(fromSeasonId, toSeasonId) {
  const [toDivisions, assignmentRows, standingRows] = await Promise.all([
    query(`SELECT id, name FROM divisions WHERE season_id = $1`, [toSeasonId]),
    query(
      `SELECT spd.player_id, d.name AS division_name
       FROM season_player_divisions spd
       JOIN divisions d ON d.id = spd.division_id
       WHERE spd.season_id = $1`,
      [fromSeasonId]
    ),
    query(
      `SELECT
         m.player_id,
         p.name AS player_name,
         d.name AS division_name,
         COUNT(*) AS games,
         COUNT(*) FILTER (WHERE m.result = 'W') AS wins,
         COUNT(*) FILTER (WHERE m.result = 'L') AS losses,
         COALESCE(SUM(
           COALESCE(m.primary_score_player, 0)
           + COALESCE(m.secondary_score_player, 0)
           + COALESCE(m.destruction_score_player, 0)
         ), 0) AS total_vp
       FROM matches m
       JOIN players p ON p.id = m.player_id
       JOIN divisions d ON d.id = m.division_id
       WHERE m.season_id = $1
         AND m.match_type = 'league'
       GROUP BY m.player_id, p.name, d.name`,
      [fromSeasonId]
    )
  ]);

  const toPremier = toDivisions.rows.find((d) => d.name === 'Premier');
  const toStump = toDivisions.rows.find((d) => d.name === 'Stump');
  if (!toPremier || !toStump) {
    throw new Error('Target season divisions are missing.');
  }

  /** @type {Map<number, { id:number, name:string, division:string, games:number, wins:number, losses:number, totalVp:number }>} */
  const playerMap = new Map();

  for (const row of standingRows.rows) {
    playerMap.set(Number(row.player_id), {
      id: Number(row.player_id),
      name: row.player_name,
      division: row.division_name,
      games: Number(row.games || 0),
      wins: Number(row.wins || 0),
      losses: Number(row.losses || 0),
      totalVp: Number(row.total_vp || 0)
    });
  }

  if (assignmentRows.rows.length) {
    const idsMissingStats = assignmentRows.rows
      .map((row) => Number(row.player_id))
      .filter((id) => !playerMap.has(id));
    if (idsMissingStats.length) {
      const { rows: missingPlayers } = await query(
        `SELECT id, name FROM players WHERE id = ANY($1)`,
        [idsMissingStats]
      );
      const nameById = new Map(missingPlayers.map((p) => [Number(p.id), p.name]));
      for (const row of assignmentRows.rows) {
        const id = Number(row.player_id);
        if (playerMap.has(id)) continue;
        playerMap.set(id, {
          id,
          name: nameById.get(id) || `Player ${id}`,
          division: row.division_name,
          games: 0,
          wins: 0,
          losses: 0,
          totalVp: 0
        });
      }
    }
  }

  const premierRows = [...playerMap.values()].filter((p) => p.division === 'Premier');
  const stumpRows = [...playerMap.values()].filter((p) => p.division === 'Stump');

  const sorter = (a, b) => {
    if (b.totalVp !== a.totalVp) return b.totalVp - a.totalVp;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.name.localeCompare(b.name);
  };

  premierRows.sort(sorter);
  stumpRows.sort(sorter);

  const promoted = stumpRows.slice(0, 3).map((row) => row.id);
  const relegated = premierRows.slice(Math.max(0, premierRows.length - 3)).map((row) => row.id);

  const nextPremier = new Set(
    premierRows.map((row) => row.id).filter((id) => !relegated.includes(id))
  );
  const nextStump = new Set(
    stumpRows.map((row) => row.id).filter((id) => !promoted.includes(id))
  );

  for (const id of promoted) nextPremier.add(id);
  for (const id of relegated) nextStump.add(id);

  const insertRows = [];
  for (const playerId of nextPremier) {
    insertRows.push({ playerId, divisionId: Number(toPremier.id) });
  }
  for (const playerId of nextStump) {
    insertRows.push({ playerId, divisionId: Number(toStump.id) });
  }

  for (const row of insertRows) {
    await query(
      `INSERT INTO season_player_divisions (season_id, division_id, player_id, source)
       VALUES ($1, $2, $3, 'rollover')
       ON CONFLICT (season_id, player_id)
       DO UPDATE SET division_id = EXCLUDED.division_id, source = EXCLUDED.source`,
      [toSeasonId, row.divisionId, row.playerId]
    );
  }

  const promotedNames = stumpRows
    .filter((row) => promoted.includes(row.id))
    .map((row) => row.name);
  const relegatedNames = premierRows
    .filter((row) => relegated.includes(row.id))
    .map((row) => row.name);

  return {
    fromSeasonId,
    promoted: promotedNames,
    relegated: relegatedNames,
    assignedPlayers: insertRows.length
  };
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
  const applyRollover = normalizeOptionalBoolean(body.applyRollover, true);
  if (!seasonYear || seasonYear < 2000 || seasonYear > 2200) {
    return errorResponse('seasonYear must be a valid year.');
  }

  const label = normalizeString(body.label || `Season ${seasonYear}`, 80);
  const { rows: existingRows } = await query(
    `SELECT id, season_year AS "seasonYear", label FROM seasons WHERE season_year = $1`,
    [seasonYear]
  );
  const existing = existingRows[0] || null;

  if (existing) {
    const { rows: updatedRows } = await query(
      `UPDATE seasons SET label = $2 WHERE season_year = $1
       RETURNING id, season_year AS "seasonYear", label`,
      [seasonYear, label]
    );
    const season = updatedRows[0];
    await ensureSeasonDivisions(season.id);
    return jsonResponse({ success: true, season, created: false, rollover: null }, 200);
  }

  const { rows } = await query(
    `INSERT INTO seasons (season_year, label)
     VALUES ($1, $2)
     RETURNING id, season_year AS "seasonYear", label`,
    [seasonYear, label]
  );

  const season = rows[0];
  await ensureSeasonDivisions(season.id);

  let rollover = null;
  if (applyRollover) {
    const { rows: priorRows } = await query(
      `SELECT id, season_year
       FROM seasons
       WHERE season_year < $1
       ORDER BY season_year DESC
       LIMIT 1`,
      [seasonYear]
    );
    const previousSeason = priorRows[0] || null;

    if (previousSeason) {
      rollover = await applySeasonRollover(Number(previousSeason.id), Number(season.id));
      rollover.fromSeasonYear = Number(previousSeason.season_year);
      rollover.applied = true;
    } else {
      rollover = {
        applied: false,
        reason: 'No previous season available for rollover.',
        promoted: [],
        relegated: [],
        assignedPlayers: 0
      };
    }
  }

  return jsonResponse({ success: true, season, created: true, rollover }, 201);
});
