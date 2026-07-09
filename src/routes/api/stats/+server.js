import { query } from '$lib/db.js';
import { jsonResponse } from '$lib/validation.js';

export async function GET() {
  const [playersResult, matchesResult] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM players`),
    query(`SELECT COUNT(*) AS total FROM matches`)
  ]);

  const totalPlayers = Number(playersResult.rows[0].total);
  const totalGames = Number(matchesResult.rows[0].total);

  // Most played army
  const { rows: armyCountRows } = await query(`
    SELECT army_used, COUNT(*) AS cnt
    FROM matches
    GROUP BY army_used
    ORDER BY cnt DESC
    LIMIT 1
  `);
  const mostPlayedArmy = armyCountRows[0]?.army_used ?? 'N/A';

  // Leaderboard — players with >= 3 games
  const { rows: leaderRows } = await query(`
    SELECT
      p.slug AS id, p.name,
      COUNT(m.id)                                         AS total,
      COUNT(m.id) FILTER (WHERE m.result = 'W')           AS wins,
      COUNT(m.id) FILTER (WHERE m.result = 'L')           AS losses,
      COUNT(m.id) FILTER (WHERE m.result = 'D')           AS draws,
      ROUND(COUNT(m.id) FILTER (WHERE m.result = 'W') * 100.0 / COUNT(m.id)) AS win_rate
    FROM players p
    JOIN matches m ON m.player_id = p.id
    GROUP BY p.id
    HAVING COUNT(m.id) >= 3
    ORDER BY win_rate DESC, wins DESC
  `);

  const leaderboard = leaderRows.map((r) => ({
    id: r.id,
    name: r.name,
    wins: Number(r.wins),
    losses: Number(r.losses),
    draws: Number(r.draws),
    total: Number(r.total),
    winRate: Number(r.win_rate)
  }));

  // Army win rates
  const { rows: armyRows } = await query(`
    SELECT
      army_used AS army,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE result = 'W') AS wins,
      ROUND(COUNT(*) FILTER (WHERE result = 'W') * 100.0 / COUNT(*)) AS win_rate
    FROM matches
    GROUP BY army_used
    ORDER BY win_rate DESC, total DESC
  `);

  const armyWinRates = armyRows.map((r) => ({
    army: r.army,
    wins: Number(r.wins),
    total: Number(r.total),
    winRate: Number(r.win_rate)
  }));

  return jsonResponse({ totalPlayers, totalGames, mostPlayedArmy, leaderboard, armyWinRates });
}
