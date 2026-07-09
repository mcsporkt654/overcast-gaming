import { query } from '$lib/db.js';
import { normalizeString, isIsoDate, invertResult, errorResponse, jsonResponse } from '$lib/validation.js';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function GET({ params }) {
  const { id } = params;

  // Resolve slug → numeric id
  const { rows: playerRows } = await query(
    `SELECT id, slug, name, photo, armies, socials FROM players WHERE slug = $1`,
    [id]
  );

  if (!playerRows.length) return errorResponse('Player not found.', 404);
  const player = playerRows[0];

  const { rows: matchRows } = await query(
    `SELECT * FROM matches WHERE player_id = $1 ORDER BY match_date DESC`,
    [player.id]
  );

  const matches = matchRows.map(rowToMatch);

  const summary = { wins: 0, losses: 0, draws: 0, total: matches.length };
  const factionMap = new Map();
  const subfactionMap = new Map();
  const monthlyMap = new Map();

  for (const m of matches) {
    const result = m.result;
    const army = normalizeString(m.armyUsed, 80) || 'Unknown';
    const subfaction = normalizeString(m.armySubfaction, 80) || 'Unspecified';
    const month = isIsoDate(m.date) ? m.date.slice(0, 7) : 'Unknown';

    if (result === 'W') summary.wins++;
    if (result === 'L') summary.losses++;
    if (result === 'D') summary.draws++;

    if (!factionMap.has(army)) {
      factionMap.set(army, { army, wins: 0, losses: 0, draws: 0, total: 0, firstDate: m.date, lastDate: m.date });
    }
    const fr = factionMap.get(army);
    fr.total++;
    fr.firstDate = fr.firstDate < m.date ? fr.firstDate : m.date;
    fr.lastDate = fr.lastDate > m.date ? fr.lastDate : m.date;
    if (result === 'W') fr.wins++;
    if (result === 'L') fr.losses++;
    if (result === 'D') fr.draws++;

    const subKey = `${army}__${subfaction}`;
    if (!subfactionMap.has(subKey)) {
      subfactionMap.set(subKey, { army, subfaction, wins: 0, losses: 0, draws: 0, total: 0, firstDate: m.date, lastDate: m.date });
    }
    const sr = subfactionMap.get(subKey);
    sr.total++;
    sr.firstDate = sr.firstDate < m.date ? sr.firstDate : m.date;
    sr.lastDate = sr.lastDate > m.date ? sr.lastDate : m.date;
    if (result === 'W') sr.wins++;
    if (result === 'L') sr.losses++;
    if (result === 'D') sr.draws++;

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { month, wins: 0, losses: 0, draws: 0, total: 0 });
    }
    const mr = monthlyMap.get(month);
    mr.total++;
    if (result === 'W') mr.wins++;
    if (result === 'L') mr.losses++;
    if (result === 'D') mr.draws++;
  }

  const winRate = summary.total ? Math.round((summary.wins / summary.total) * 100) : 0;

  return jsonResponse({
    player: { id: player.slug, name: player.name, photo: player.photo, armies: player.armies, socials: player.socials },
    summary: { ...summary, winRate },
    factionStats: Array.from(factionMap.values())
      .map((r) => ({ ...r, winRate: r.total ? Math.round((r.wins / r.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total || b.winRate - a.winRate),
    subfactionStats: Array.from(subfactionMap.values())
      .map((r) => ({ ...r, winRate: r.total ? Math.round((r.wins / r.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total || b.winRate - a.winRate),
    monthlyStats: Array.from(monthlyMap.values())
      .map((r) => ({ ...r, winRate: r.total ? Math.round((r.wins / r.total) * 100) : 0 }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    matches
  });
}

/** @param {Record<string,unknown>} row */
function rowToMatch(row) {
  return {
    id: row.id,
    date: row.match_date instanceof Date ? row.match_date.toISOString().slice(0, 10) : String(row.match_date).slice(0, 10),
    playerId: row.slug ?? row.player_id,
    playerName: row.player_name,
    armyUsed: row.army_used,
    armySubfaction: row.army_subfaction,
    armyPoints: row.army_points,
    playerUnits: row.player_units ?? [],
    opponentName: row.opponent_name,
    opponentArmy: row.opponent_army,
    opponentSubfaction: row.opponent_subfaction,
    opponentPoints: row.opponent_points,
    opponentUnits: row.opponent_units ?? [],
    missionId: row.mission_id ?? '',
    missionName: row.mission_name ?? '',
    eventId: row.event_id ?? '',
    eventName: row.event_name ?? '',
    primaryScorePlayer: row.primary_score_player,
    primaryScoreOpponent: row.primary_score_opponent,
    secondaryScorePlayer: row.secondary_score_player,
    secondaryScoreOpponent: row.secondary_score_opponent,
    destructionScorePlayer: row.destruction_score_player,
    destructionScoreOpponent: row.destruction_score_opponent,
    result: row.result,
    pointsDiff: row.points_diff,
    battleNotes: row.battle_notes ?? ''
  };
}
