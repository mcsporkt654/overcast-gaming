import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const TTL_SECONDS = 60 * 60 * 8; // 8 hours — matches old session TTL
const COOKIE_NAME = 'overcast_admin';

if (!SECRET) {
  console.error('JWT_SECRET not set — admin routes will be disabled.');
}

// JWTs are stateless, so logout can't just "delete a session" like the old
// Express in-memory sessions map did. Track revoked tokens until they'd have
// expired anyway, so a logged-out token (e.g. one still used via the legacy
// x-admin-token header) stops working immediately instead of staying valid
// for up to 8 more hours.
/** @type {Map<string, number>} token -> expiresAtMs */
const revokedTokens = new Map();

function pruneRevoked(now = Date.now()) {
  for (const [token, expiresAt] of revokedTokens.entries()) {
    if (expiresAt <= now) revokedTokens.delete(token);
  }
}

/**
 * Sign a new admin JWT and return it.
 */
export function signAdminToken() {
  if (!SECRET) throw new Error('JWT_SECRET not configured.');
  return jwt.sign({ admin: true }, SECRET, { expiresIn: TTL_SECONDS });
}

/**
 * Verify an admin JWT. Returns the payload or null.
 * @param {string | undefined} token
 */
export function verifyAdminToken(token) {
  if (!SECRET || !token) return null;
  pruneRevoked();
  if (revokedTokens.has(token)) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

/**
 * Revoke an admin JWT immediately (used on logout).
 * @param {string | undefined} token
 */
export function revokeAdminToken(token) {
  if (!token) return;
  const decoded = /** @type {{ exp?: number } | null} */ (jwt.decode(token));
  const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + TTL_SECONDS * 1000;
  revokedTokens.set(token, expiresAt);
}

/**
 * Build a Set-Cookie header value for the admin JWT.
 * HttpOnly + SameSite=Strict prevents JS access and CSRF.
 */
export function buildAdminCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL_SECONDS}`;
}

/**
 * Build a Set-Cookie header that clears the admin cookie.
 */
export function clearAdminCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

/**
 * Extract the admin token from a SvelteKit RequestEvent.
 * Checks the HttpOnly cookie first, then falls back to the
 * legacy X-Admin-Token header so the existing admin.html keeps working
 * until it is ported to a Svelte page.
 *
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function extractAdminToken(event) {
  const cookie = event.cookies.get(COOKIE_NAME);
  if (cookie) return cookie;
  return event.request.headers.get('x-admin-token') ?? undefined;
}

export { COOKIE_NAME };
