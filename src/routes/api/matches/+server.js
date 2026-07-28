import { query, withDb } from '$lib/db.js';
import {
  normalizeString,
  isIsoDate,
  normalizeOptionalInteger,
  normalizeUnits,
  errorResponse,
  jsonResponse
} from '$lib/validation.js';

export const GET = withDb(async () => {
  const { rows } = await query(`
    SELECT
      m.*,
      p.slug AS player_slug
    FROM matches m
    JOIN players p ON p.id = m.player_id
    ORDER BY m.match_date DESC
  `);

  return jsonResponse(rows.map(rowToMatch));
});

export const POST = withDb(async ({ request, locals }) => {
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body.');

  const {
    date, playerId, armyUsed, armySubfaction, armyPoints, playerUnits,
    opponentName, opponentArmy, opponentSubfaction, opponentPoints, opponentUnits,
    missionId, eventId,
    primaryScorePlayer, primaryScoreOpponent,
    secondaryScorePlayer, secondaryScoreOpponent,
    destructionScorePlayer, destructionScoreOpponent,
    result, pointsDiff, battleNotes
  } = body;

  if (!date || !playerId || !armyUsed || !opponentName || !opponentArmy || !result) {
    return errorResponse('date, playerId, armyUsed, opponentName, opponentArmy, and result are required.');
  }
  if (!isIsoDate(date)) return errorResponse('date must be YYYY-MM-DD.');

  const normalizedResult = String(result).toUpperCase();
  if (!['W', 'L', 'D'].includes(normalizedResult)) {
    return errorResponse('result must be W, L, or D.');
  }

  // Resolve player slug → numeric id
  const { rows: pRows } = await query(`SELECT id, name FROM players WHERE slug = $1`, [playerId]);
  if (!pRows.length) return errorResponse('Player not found.', 404);
  const player = pRows[0];

  const cleanArmyUsed = normalizeString(armyUsed, 80);
  const cleanOpponentName = normalizeString(opponentName, 80);
  const cleanOpponentArmy = normalizeString(opponentArmy, 80);
  if (!cleanArmyUsed || !cleanOpponentName || !cleanOpponentArmy) {
    return errorResponse('Army and opponent fields must be valid strings.');
  }

  let normalizedPointsDiff = null;
  if (pointsDiff !== undefined && pointsDiff !== '') {
    const parsed = Number.parseInt(String(pointsDiff), 10);
    if (Number.isNaN(parsed)) return errorResponse('pointsDiff must be a valid integer.');
    normalizedPointsDiff = parsed;
  }

  // Resolve optional mission / event
  const cleanMissionId = normalizeString(missionId, 80);
  let missionName = '';
  if (cleanMissionId) {
    const { rows: mRows } = await query(`SELECT name FROM missions WHERE id = $1`, [cleanMissionId]);
    if (!mRows.length) return errorResponse('missionId does not match any known mission.');
    missionName = mRows[0].name;
  }

  const cleanEventId = normalizeString(eventId, 80);
  let eventName = '';
  if (cleanEventId) {
    const { rows: eRows } = await query(`SELECT name FROM events WHERE id = $1`, [cleanEventId]);
    if (!eRows.length) return errorResponse('eventId does not match any known event.');
    eventName = eRows[0].name;
  }

  const newId = 'match-' + Date.now();
  const { rows } = await query(
    `INSERT INTO matches (
       id, match_date, player_id, player_name,
       army_used, army_subfaction, army_points, player_units,
       opponent_name, opponent_army, opponent_subfaction, opponent_points, opponent_units,
       mission_id, mission_name, event_id, event_name,
       primary_score_player, primary_score_opponent,
       secondary_score_player, secondary_score_opponent,
       destruction_score_player, destruction_score_opponent,
       result, points_diff, battle_notes
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
       $18,$19,$20,$21,$22,$23,$24,$25,$26
     )
     RETURNING *`,
    [
      newId, date, player.id, player.name,
      cleanArmyUsed, normalizeString(armySubfaction, 80), normalizeOptionalInteger(armyPoints),
      JSON.stringify(normalizeUnits(playerUnits)),
      cleanOpponentName, cleanOpponentArmy, normalizeString(opponentSubfaction, 80),
      normalizeOptionalInteger(opponentPoints), JSON.stringify(normalizeUnits(opponentUnits)),
      cleanMissionId || null, missionName,
      cleanEventId || null, eventName,
      normalizeOptionalInteger(primaryScorePlayer), normalizeOptionalInteger(primaryScoreOpponent),
      normalizeOptionalInteger(secondaryScorePlayer), normalizeOptionalInteger(secondaryScoreOpponent),
      normalizeOptionalInteger(destructionScorePlayer), normalizeOptionalInteger(destructionScoreOpponent),
      normalizedResult, normalizedPointsDiff, normalizeString(battleNotes, 1500)
    ]
  );

  // Attach player slug so the response shape matches the old API
  const row = { ...rows[0], player_slug: playerId };
  return jsonResponse({ success: true, match: rowToMatch(row) }, 201);
});

/** @param {Record<string,unknown>} row */
function rowToMatch(row) {
  return {
    id: row.id,
    date: row.match_date instanceof Date
      ? row.match_date.toISOString().slice(0, 10)
      : String(row.match_date).slice(0, 10),
    playerId: row.player_slug ?? row.player_id,
    playerName: row.player_name,
    armyUsed: row.army_used,
    armySubfaction: row.army_subfaction ?? '',
    armyPoints: row.army_points,
    playerUnits: row.player_units ?? [],
    opponentName: row.opponent_name,
    opponentArmy: row.opponent_army,
    opponentSubfaction: row.opponent_subfaction ?? '',
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
