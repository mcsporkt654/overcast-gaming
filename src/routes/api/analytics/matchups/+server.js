import { query, withDb } from '$lib/db.js';
import { normalizeString, invertResult, jsonResponse } from '$lib/validation.js';

export const GET = withDb(async ({ url }) => {
  const armyFilter = normalizeString(url.searchParams.get('army') ?? '', 80);
  const opponentFilter = normalizeString(url.searchParams.get('opponent') ?? '', 80);

  // Fetch both sides of every match in a single query.
  // Side A = the player's perspective; Side B = inverted for their opponent.
  const { rows: matches } = await query(`
    SELECT army_used, opponent_army, result, points_diff, match_date
    FROM matches
  `);

  const sideRecords = [];
  for (const m of matches) {
    const result = ['W', 'L', 'D'].includes(m.result) ? m.result : 'D';
    const pointsDiff = Number.isInteger(m.points_diff) ? m.points_diff : null;
    const date = m.match_date instanceof Date
      ? m.match_date.toISOString().slice(0, 10)
      : String(m.match_date).slice(0, 10);
    if (m.army_used && m.opponent_army) {
      sideRecords.push({ army: m.army_used, opponentArmy: m.opponent_army, result, pointsDiff, date });
      sideRecords.push({ army: m.opponent_army, opponentArmy: m.army_used, result: invertResult(result), pointsDiff: pointsDiff === null ? null : -pointsDiff, date });
    }
  }

  /** @type {Record<string, { army: string, opponentArmy: string, wins: number, losses: number, draws: number, totalGames: number, totalPointsDiff: number }>} */
  const matchupMap = {};
  for (const r of sideRecords) {
    if (armyFilter && r.army !== armyFilter) continue;
    if (opponentFilter && r.opponentArmy !== opponentFilter) continue;
    const key = `${r.army}__${r.opponentArmy}`;
    if (!matchupMap[key]) {
      matchupMap[key] = { army: r.army, opponentArmy: r.opponentArmy, wins: 0, losses: 0, draws: 0, totalGames: 0, totalPointsDiff: 0 };
    }
    const row = matchupMap[key];
    row.totalGames++;
    if (r.result === 'W') row.wins++;
    if (r.result === 'L') row.losses++;
    if (r.result === 'D') row.draws++;
    if (r.pointsDiff !== null) row.totalPointsDiff += r.pointsDiff;
  }

  const matchups = Object.values(matchupMap)
    .map((row) => ({
      ...row,
      winRate: row.totalGames ? Math.round((row.wins / row.totalGames) * 100) : 0,
      avgPointsDiff: row.totalGames ? Number((row.totalPointsDiff / row.totalGames).toFixed(1)) : 0
    }))
    .sort((a, b) => b.totalGames - a.totalGames || b.winRate - a.winRate);

  const factions = [...new Set(sideRecords.map((r) => r.army))].sort();
  return jsonResponse({ factions, matchups });
});
