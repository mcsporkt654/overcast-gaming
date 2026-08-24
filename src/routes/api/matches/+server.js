import { query, withDb } from '$lib/db.js';
import {
  normalizeString,
  isIsoDate,
  normalizeOptionalInteger,
  normalizeUnits,
  errorResponse,
  jsonResponse
} from '$lib/validation.js';

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

export const GET = withDb(async ({ url }) => {
  const includeExhibition = url.searchParams.get('includeExhibition') === '1';
  const seasonId = normalizeOptionalId(url.searchParams.get('seasonId'));
  const divisionId = normalizeOptionalId(url.searchParams.get('divisionId'));
  const divisionName = normalizeString(url.searchParams.get('division') || '', 40);

  const where = [];
  const params = [];

  if (!includeExhibition) {
    where.push(`m.match_type = 'league'`);
  }
  if (seasonId) {
    params.push(seasonId);
    where.push(`m.season_id = $${params.length}`);
  }
  if (divisionId) {
    params.push(divisionId);
    where.push(`m.division_id = $${params.length}`);
  }
  if (!divisionId && divisionName) {
    params.push(divisionName);
    where.push(`d.name = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await query(`
    SELECT
      m.*,
      p.slug AS player_slug,
      s.season_year,
      d.name AS division_name,
      pd.name AS player_detachment_name,
      od.name AS opponent_detachment_name
    FROM matches m
    JOIN players p ON p.id = m.player_id
    LEFT JOIN seasons s ON s.id = m.season_id
    LEFT JOIN divisions d ON d.id = m.division_id
    LEFT JOIN detachments pd ON pd.id = m.player_detachment_id
    LEFT JOIN detachments od ON od.id = m.opponent_detachment_id
    ${whereClause}
    ORDER BY m.match_date DESC
  `, params);

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
    seasonId, divisionId, matchType, ruleset,
    playerDetachmentId, opponentDetachmentId,
    primaryScorePlayer, primaryScoreOpponent,
    secondaryScorePlayer, secondaryScoreOpponent,
    destructionScorePlayer, destructionScoreOpponent,
    result, pointsDiff, battleNotes
  } = body;

  if (!date || !playerId || !armyUsed || !opponentName || !opponentArmy || !result) {
    return errorResponse('date, playerId, armyUsed, opponentName, opponentArmy, and result are required.');
  }
  if (!isIsoDate(date)) return errorResponse('date must be YYYY-MM-DD.');

  const normalizedMatchType = normalizeString(matchType || 'league', 20).toLowerCase();
  if (!['league', 'exhibition'].includes(normalizedMatchType)) {
    return errorResponse('matchType must be league or exhibition.');
  }

  const normalizedSeasonId = normalizeOptionalId(seasonId);
  const normalizedDivisionId = normalizeOptionalId(divisionId);
  if (normalizedMatchType === 'league' && (!normalizedSeasonId || !normalizedDivisionId)) {
    return errorResponse('seasonId and divisionId are required for league matches.');
  }

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
  let missionPack = '';
  if (cleanMissionId) {
    const { rows: mRows } = await query(`SELECT name, mission_pack FROM missions WHERE id = $1`, [cleanMissionId]);
    if (!mRows.length) return errorResponse('missionId does not match any known mission.');
    missionName = mRows[0].name;
    missionPack = mRows[0].mission_pack || '';
  }

  const cleanEventId = normalizeString(eventId, 80);
  let eventName = '';
  if (cleanEventId) {
    const { rows: eRows } = await query(`SELECT name FROM events WHERE id = $1`, [cleanEventId]);
    if (!eRows.length) return errorResponse('eventId does not match any known event.');
    eventName = eRows[0].name;
  }

  let seasonYear = null;
  if (normalizedSeasonId) {
    const { rows: sRows } = await query(`SELECT season_year FROM seasons WHERE id = $1`, [normalizedSeasonId]);
    if (!sRows.length) return errorResponse('seasonId does not match any known season.');
    seasonYear = Number(sRows[0].season_year);
  }

  let divisionName = '';
  if (normalizedDivisionId) {
    const { rows: dRows } = await query(`SELECT season_id, name FROM divisions WHERE id = $1`, [normalizedDivisionId]);
    if (!dRows.length) return errorResponse('divisionId does not match any known division.');
    divisionName = dRows[0].name;
    if (normalizedSeasonId && Number(dRows[0].season_id) !== normalizedSeasonId) {
      return errorResponse('divisionId does not belong to seasonId.');
    }
  }

  const normalizedPlayerDetachmentId = normalizeOptionalId(playerDetachmentId);
  const normalizedOpponentDetachmentId = normalizeOptionalId(opponentDetachmentId);

  if (normalizedPlayerDetachmentId) {
    const { rows: detRows } = await query(`SELECT id FROM detachments WHERE id = $1`, [normalizedPlayerDetachmentId]);
    if (!detRows.length) return errorResponse('playerDetachmentId does not match any known detachment.');
  }
  if (normalizedOpponentDetachmentId) {
    const { rows: detRows } = await query(`SELECT id FROM detachments WHERE id = $1`, [normalizedOpponentDetachmentId]);
    if (!detRows.length) return errorResponse('opponentDetachmentId does not match any known detachment.');
  }

  const newId = 'match-' + Date.now();
  const { rows } = await query(
    `INSERT INTO matches (
       id, match_date, player_id, player_name,
       army_used, army_subfaction, army_points, player_units,
       opponent_name, opponent_army, opponent_subfaction, opponent_points, opponent_units,
       mission_id, mission_name, mission_pack, event_id, event_name,
       season_id, division_id, match_type, ruleset,
       player_detachment_id, opponent_detachment_id,
       primary_score_player, primary_score_opponent,
       secondary_score_player, secondary_score_opponent,
       destruction_score_player, destruction_score_opponent,
       result, points_diff, battle_notes
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
       $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
     )
     RETURNING *`,
    [
      newId, date, player.id, player.name,
      cleanArmyUsed, normalizeString(armySubfaction, 80), normalizeOptionalInteger(armyPoints),
      JSON.stringify(normalizeUnits(playerUnits)),
      cleanOpponentName, cleanOpponentArmy, normalizeString(opponentSubfaction, 80),
      normalizeOptionalInteger(opponentPoints), JSON.stringify(normalizeUnits(opponentUnits)),
      cleanMissionId || null, missionName, missionPack,
      cleanEventId || null, eventName,
      normalizedSeasonId,
      normalizedDivisionId,
      normalizedMatchType,
      normalizeString(ruleset || 'WH40K', 40) || 'WH40K',
      normalizedPlayerDetachmentId,
      normalizedOpponentDetachmentId,
      normalizeOptionalInteger(primaryScorePlayer), normalizeOptionalInteger(primaryScoreOpponent),
      normalizeOptionalInteger(secondaryScorePlayer), normalizeOptionalInteger(secondaryScoreOpponent),
      normalizeOptionalInteger(destructionScorePlayer), normalizeOptionalInteger(destructionScoreOpponent),
      normalizedResult, normalizedPointsDiff, normalizeString(battleNotes, 1500)
    ]
  );

  // Attach player slug so the response shape matches the old API
  const row = {
    ...rows[0],
    player_slug: playerId,
    season_year: seasonYear,
    division_name: divisionName
  };
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
    missionPack: row.mission_pack ?? '',
    eventId: row.event_id ?? '',
    eventName: row.event_name ?? '',
    seasonId: row.season_id ?? null,
    seasonYear: row.season_year ?? null,
    divisionId: row.division_id ?? null,
    divisionName: row.division_name ?? '',
    matchType: row.match_type ?? 'league',
    ruleset: row.ruleset ?? 'WH40K',
    playerDetachmentId: row.player_detachment_id ?? null,
    opponentDetachmentId: row.opponent_detachment_id ?? null,
    playerDetachmentName: row.player_detachment_name ?? '',
    opponentDetachmentName: row.opponent_detachment_name ?? '',
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
