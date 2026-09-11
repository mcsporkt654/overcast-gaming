/**
 * Battles are logged as one row per participant, from that player's own
 * perspective. When both sides of a battle are rostered league players and
 * each logs it, the same real-world battle ends up as two mirrored rows
 * (result, army, and player/opponent swapped and inverted). Per-player stats
 * need both rows, but shared logs (recent battles, match history) should
 * only show the battle once.
 *
 * @param {Array<Record<string, any>>} matches matches in `/api/matches` shape, newest first
 * @returns {Array<Record<string, any>>} one row per real-world battle
 */
export function dedupeBattles(matches) {
  const consumedIds = new Set();
  const deduped = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (consumedIds.has(match.id)) continue;
    deduped.push(match);

    const mirror = matches
      .slice(i + 1)
      .find((other) => !consumedIds.has(other.id) && isMirroredBattle(match, other));
    if (mirror) consumedIds.add(mirror.id);
  }

  return deduped;
}

/** @param {Record<string, any>} a @param {Record<string, any>} b */
function isMirroredBattle(a, b) {
  return (
    a.date === b.date &&
    a.playerName === b.opponentName &&
    a.opponentName === b.playerName &&
    a.armyUsed === b.opponentArmy &&
    a.opponentArmy === b.armyUsed &&
    isInvertedResult(a.result, b.result)
  );
}

/** @param {string} a @param {string} b */
function isInvertedResult(a, b) {
  if (a === 'D' && b === 'D') return true;
  return (a === 'W' && b === 'L') || (a === 'L' && b === 'W');
}
