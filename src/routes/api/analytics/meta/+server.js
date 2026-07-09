import { query } from '$lib/db.js';
import { invertResult, isIsoDate, jsonResponse } from '$lib/validation.js';

export async function GET() {
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
    if (m.army_used && m.opponent_army && isIsoDate(date)) {
      sideRecords.push({ army: m.army_used, result, pointsDiff, date });
      sideRecords.push({ army: m.opponent_army, result: invertResult(result), pointsDiff: pointsDiff === null ? null : -pointsDiff, date });
    }
  }

  let totalAppearances = 0;
  /** @type {Record<string, { faction: string, wins: number, losses: number, draws: number, totalGames: number, totalPointsDiff: number }>} */
  const overallMap = {};
  /** @type {Record<string, Record<string, { faction: string, games: number, wins: number, losses: number, draws: number }>>} */
  const monthlyMap = {};

  for (const r of sideRecords) {
    totalAppearances++;

    if (!overallMap[r.army]) {
      overallMap[r.army] = { faction: r.army, wins: 0, losses: 0, draws: 0, totalGames: 0, totalPointsDiff: 0 };
    }
    const overall = overallMap[r.army];
    overall.totalGames++;
    if (r.result === 'W') overall.wins++;
    if (r.result === 'L') overall.losses++;
    if (r.result === 'D') overall.draws++;
    if (r.pointsDiff !== null) overall.totalPointsDiff += r.pointsDiff;

    const monthKey = r.date.slice(0, 7);
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = {};
    if (!monthlyMap[monthKey][r.army]) {
      monthlyMap[monthKey][r.army] = { faction: r.army, games: 0, wins: 0, losses: 0, draws: 0 };
    }
    const monthly = monthlyMap[monthKey][r.army];
    monthly.games++;
    if (r.result === 'W') monthly.wins++;
    if (r.result === 'L') monthly.losses++;
    if (r.result === 'D') monthly.draws++;
  }

  const overallResult = Object.values(overallMap)
    .map((row) => ({
      ...row,
      winRate: row.totalGames ? Math.round((row.wins / row.totalGames) * 100) : 0,
      avgPointsDiff: row.totalGames ? Number((row.totalPointsDiff / row.totalGames).toFixed(1)) : 0,
      metaShare: totalAppearances ? Math.round((row.totalGames / totalAppearances) * 100) : 0
    }))
    .sort((a, b) => b.totalGames - a.totalGames || b.winRate - a.winRate);

  const monthly = Object.keys(monthlyMap)
    .sort()
    .map((month) => {
      const rows = Object.values(monthlyMap[month]);
      const totalGames = rows.reduce((sum, r) => sum + r.games, 0);
      return {
        month,
        totalGames,
        factions: rows
          .map((r) => ({
            ...r,
            winRate: r.games ? Math.round((r.wins / r.games) * 100) : 0,
            metaShare: totalGames ? Math.round((r.games / totalGames) * 100) : 0
          }))
          .sort((a, b) => b.games - a.games)
      };
    });

  return jsonResponse({ totalAppearances, overall: overallResult, monthly });
}
