import { query, withDb } from '$lib/db.js';
import { jsonResponse } from '$lib/validation.js';

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

export const GET = withDb(async ({ url }) => {
  const includeExhibition = url.searchParams.get('includeExhibition') === '1';
  const seasonId = normalizeOptionalId(url.searchParams.get('seasonId'));
  const divisionId = normalizeOptionalId(url.searchParams.get('divisionId'));

  const whereM = [];
  const params = [];
  if (!includeExhibition) whereM.push(`m.match_type = 'league'`);
  if (seasonId) {
    params.push(seasonId);
    whereM.push(`m.season_id = $${params.length}`);
  }
  if (divisionId) {
    params.push(divisionId);
    whereM.push(`m.division_id = $${params.length}`);
  }
  const whereMClause = whereM.length ? `WHERE ${whereM.join(' AND ')}` : '';
  const wherePlainClause = whereMClause.replaceAll('m.', '');

  const [
    playersResult,
    matchesResult,
    armyCountResult,
    leaderResult,
    armyResult,
    standingsResult
  ] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM players`),
    query(`SELECT COUNT(*) AS total FROM matches ${wherePlainClause}`, params),
    query(`
      SELECT army_used, COUNT(*) AS cnt
      FROM matches
      ${wherePlainClause}
      GROUP BY army_used
      ORDER BY cnt DESC
      LIMIT 1
    `, params),
    query(`
      SELECT
        p.slug AS id, p.name,
        COUNT(m.id)                                         AS total,
        COUNT(m.id) FILTER (WHERE m.result = 'W')           AS wins,
        COUNT(m.id) FILTER (WHERE m.result = 'L')           AS losses,
        COUNT(m.id) FILTER (WHERE m.result = 'D')           AS draws,
        ROUND(COUNT(m.id) FILTER (WHERE m.result = 'W') * 100.0 / COUNT(m.id)) AS win_rate
      FROM players p
      JOIN matches m ON m.player_id = p.id
      ${whereMClause}
      GROUP BY p.id
      HAVING COUNT(m.id) >= 3
      ORDER BY win_rate DESC, wins DESC
    `, params),
    query(`
      SELECT
        army_used AS army,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE result = 'W') AS wins,
        ROUND(COUNT(*) FILTER (WHERE result = 'W') * 100.0 / COUNT(*)) AS win_rate
      FROM matches
      ${wherePlainClause}
      GROUP BY army_used
      ORDER BY win_rate DESC, total DESC
    `, params),
    // League standings. VP is derived — the schema has no VP column, so it's
    // the sum of a match's primary/secondary/destruction scores. Unlike
    // `leaderboard` above there is deliberately no minimum-games filter: the
    // roster is small enough that a 3-game floor renders an empty table.
    query(`
      WITH match_vp AS (
        SELECT
          player_id,
          army_used,
          result,
          COALESCE(primary_score_player, 0)
            + COALESCE(secondary_score_player, 0)
            + COALESCE(destruction_score_player, 0) AS vp
        FROM matches
        ${wherePlainClause}
      ),
      top_army AS (
        SELECT DISTINCT ON (player_id) player_id, army_used
        FROM match_vp
        GROUP BY player_id, army_used
        ORDER BY player_id, COUNT(*) DESC, army_used
      )
      SELECT
        p.slug AS id, p.name,
        p.armies[1]                                     AS roster_army,
        ta.army_used                                    AS played_army,
        COUNT(mv.player_id)                             AS games,
        COUNT(mv.player_id) FILTER (WHERE mv.result = 'W') AS wins,
        COUNT(mv.player_id) FILTER (WHERE mv.result = 'L') AS losses,
        COUNT(mv.player_id) FILTER (WHERE mv.result = 'D') AS draws,
        COALESCE(SUM(mv.vp), 0)                         AS total_vp,
        CASE WHEN COUNT(mv.player_id) > 0
          THEN ROUND(COALESCE(SUM(mv.vp), 0)::numeric / COUNT(mv.player_id), 1)
          ELSE NULL
        END AS avg_vp
      FROM players p
      LEFT JOIN match_vp mv ON mv.player_id = p.id
      LEFT JOIN top_army ta ON ta.player_id = p.id
      GROUP BY p.id, ta.army_used
      ORDER BY total_vp DESC, wins DESC, p.name
    `, params)
  ]);

  const totalPlayers = Number(playersResult.rows[0].total);
  const totalGames = Number(matchesResult.rows[0].total);
  const mostPlayedArmy = armyCountResult.rows[0]?.army_used ?? 'N/A';

  const leaderboard = leaderResult.rows.map((r) => ({
    id: r.id,
    name: r.name,
    wins: Number(r.wins),
    losses: Number(r.losses),
    draws: Number(r.draws),
    total: Number(r.total),
    winRate: Number(r.win_rate)
  }));

  const armyWinRates = armyResult.rows.map((r) => ({
    army: r.army,
    wins: Number(r.wins),
    total: Number(r.total),
    winRate: Number(r.win_rate)
  }));

  const standings = standingsResult.rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    name: r.name,
    // The army they actually field most; falls back to their first roster army
    // for players who haven't logged a match yet.
    army: r.played_army || r.roster_army || '',
    wins: Number(r.wins),
    losses: Number(r.losses),
    draws: Number(r.draws),
    games: Number(r.games),
    totalVp: Number(r.total_vp),
    avgVp: r.avg_vp !== null ? Number(r.avg_vp) : null
  }));

  return jsonResponse({
    totalPlayers,
    totalGames,
    mostPlayedArmy,
    leaderboard,
    armyWinRates,
    standings
  });
});
