import { query } from '$lib/db.js';
import { errorResponse, jsonResponse } from '$lib/validation.js';

export async function GET({ params }) {
  const { rows } = await query(
    `SELECT m.*, p.slug AS player_slug
     FROM matches m
     JOIN players p ON p.id = m.player_id
     WHERE m.id = $1`,
    [params.id]
  );

  if (!rows.length) return errorResponse('Match not found.', 404);

  const row = rows[0];
  return jsonResponse({
    id: row.id,
    date: row.match_date instanceof Date
      ? row.match_date.toISOString().slice(0, 10)
      : String(row.match_date).slice(0, 10),
    playerId: row.player_slug,
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
  });
}
