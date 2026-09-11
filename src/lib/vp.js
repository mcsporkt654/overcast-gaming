/**
 * Victory points.
 *
 * The schema has no VP column — a match stores primary / secondary /
 * destruction scores for each side, and an optional `points_diff` that the
 * admin form leaves blank in practice. VP is therefore derived: the sum of a
 * side's three score components.
 *
 * @param {Record<string, unknown>} match a match in `/api/matches` shape
 * @returns {{ player: number|null, opponent: number|null, diff: number|null }}
 */
export function matchVp(match) {
  if (!match) return { player: null, opponent: null, diff: null };

  const player = sumScores(
    match.primaryScorePlayer,
    match.secondaryScorePlayer,
    match.destructionScorePlayer
  );
  const opponent = sumScores(
    match.primaryScoreOpponent,
    match.secondaryScoreOpponent,
    match.destructionScoreOpponent
  );

  let diff = null;
  if (player !== null && opponent !== null) {
    diff = player - opponent;
  } else if (match.pointsDiff !== null && match.pointsDiff !== undefined) {
    // Fall back to the stored value when scores weren't recorded.
    diff = Number(match.pointsDiff);
  }

  return { player, opponent, diff };
}

/**
 * Null unless at least one component was recorded — a match with no scores at
 * all should read as "not recorded", not as a legitimate zero.
 *
 * @param {...unknown} parts
 * @returns {number|null}
 */
function sumScores(...parts) {
  const present = parts.filter((p) => p !== null && p !== undefined && p !== '');
  if (!present.length) return null;
  return present.reduce((sum, p) => sum + Number(p), 0);
}

/**
 * Formats a points difference the way the design does: an explicit sign, and a
 * real minus sign (U+2212) rather than a hyphen.
 *
 * @param {number|null} diff
 * @returns {string}
 */
export function formatDiff(diff) {
  if (diff === null || diff === undefined || Number.isNaN(diff)) return '—';
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `−${Math.abs(diff)}`;
  return '0';
}
