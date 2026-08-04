/**
 * Date/record formatting shared by the public pages.
 *
 * Dates arrive as `YYYY-MM-DD` strings. They're parsed at midday so a
 * timezone west of UTC can't roll them back a day.
 */

/** @param {string} date `YYYY-MM-DD` */
function parse(date) {
  return new Date(`${date}T12:00:00`);
}

/** `May 6` — the format the design uses in match tables and the ticker. */
export function shortDate(date) {
  if (!date) return '';
  return parse(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** `Feb 19, 2026` — used in card kickers. */
export function mediumDate(date) {
  if (!date) return '';
  return parse(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** `February 19, 2026` — used on article pages. */
export function longDate(date) {
  if (!date) return '';
  return parse(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** `6–1` with an en dash, or `6–1–2` when there are draws. */
export function record(wins, losses, draws = 0) {
  return draws > 0 ? `${wins}–${losses}–${draws}` : `${wins}–${losses}`;
}

/** Zero-padded rank, as in the design's `01`, `02`, … */
export function rankLabel(rank) {
  return String(rank).padStart(2, '0');
}
