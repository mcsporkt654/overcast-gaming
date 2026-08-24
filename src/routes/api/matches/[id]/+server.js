import { query, withDb } from '$lib/db.js';
import { errorResponse, jsonResponse } from '$lib/validation.js';

export const GET = withDb(async ({ params }) => {
  const { rows } = await query(
    `SELECT
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
  });
});
