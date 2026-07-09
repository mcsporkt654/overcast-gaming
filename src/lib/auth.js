import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const TTL_SECONDS = 60 * 60 * 8; // 8 hours — matches old session TTL
const COOKIE_NAME = 'overcast_admin';

if (!SECRET) {
  console.error('JWT_SECRET not set — admin routes will be disabled.');
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
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
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
