/**
 * Shared validation utilities — ported from server.js normalizers.
 */

/** @param {unknown} value @param {number} [maxLength] */
export function normalizeString(value, maxLength = 120) {
  return String(value ?? '').trim().slice(0, maxLength);
}

/** @param {unknown} value */
export function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** @param {unknown} value */
export function normalizeOptionalInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** @param {unknown} value @param {number} [maxUnits] */
export function normalizeUnits(value, maxUnits = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .map((unit) => {
      if (typeof unit === 'string') {
        const unitName = normalizeString(unit, 80);
        return unitName ? { unitName, count: 1, role: '', points: null } : null;
      }
      if (!unit || typeof unit !== 'object') return null;
      const unitName = normalizeString(/** @type {any} */ (unit).unitName, 80);
      if (!unitName) return null;
      const count = normalizeOptionalInteger(/** @type {any} */ (unit).count);
      const points = normalizeOptionalInteger(/** @type {any} */ (unit).points);
      const role = normalizeString(/** @type {any} */ (unit).role, 40);
      return { unitName, count: count && count > 0 ? count : 1, role, points: points ?? null };
    })
    .filter(Boolean)
    .slice(0, maxUnits);
}

/** @param {unknown} value */
export function normalizeHttpUrl(value) {
  const raw = normalizeString(value, 300);
  if (!raw) return '';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

/** @param {'W'|'L'|'D'} result */
export function invertResult(result) {
  if (result === 'W') return 'L';
  if (result === 'L') return 'W';
  return 'D';
}

/**
 * Construct a uniform error JSON response.
 * @param {string} message
 * @param {number} [status]
 */
export function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Construct a uniform JSON response.
 * @param {unknown} data
 * @param {number} [status]
 * @param {Record<string, string>} [extraHeaders]
 */
export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}
