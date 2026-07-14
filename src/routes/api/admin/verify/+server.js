import { signAdminToken, buildAdminCookie } from '$lib/auth.js';
import { errorResponse, jsonResponse } from '$lib/validation.js';
import { ADMIN_PASSWORD } from '$env/static/private';

// Simple in-process rate limiter (resets on server restart — acceptable for single-instance deploy)
/** @type {Map<string, { count: number, windowEndsAt: number }>} */
const loginAttempts = new Map();
const WINDOW_MS = 1000 * 60 * 15;
const MAX_ATTEMPTS = 8;

function consumeAttempt(ip) {
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || entry.windowEndsAt <= now) {
    entry = { count: 0, windowEndsAt: now + WINDOW_MS };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    loginAttempts.set(ip, entry);
    return Math.ceil((entry.windowEndsAt - now) / 1000);
  }
  entry.count++;
  loginAttempts.set(ip, entry);
  return 0;
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

export async function POST({ request, getClientAddress, cookies }) {
  if (!ADMIN_PASSWORD) {
    return errorResponse('Admin access is not configured.', 503);
  }

  const ip = getClientAddress();
  const retryAfter = consumeAttempt(ip);
  if (retryAfter > 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'Too many login attempts. Try again later.', retryAfterSeconds: retryAfter }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (body.password !== ADMIN_PASSWORD) {
    return errorResponse('Invalid credentials.', 401);
  }

  clearAttempts(ip);
  const token = signAdminToken();
  const TTL = 60 * 60 * 8;

  // Set HttpOnly cookie for browser sessions
  cookies.set('overcast_admin', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: TTL,
    secure: process.env.NODE_ENV === 'production'
  });

  // Also return the token in the body so the legacy admin.html (X-Admin-Token header flow) still works
  return jsonResponse({ success: true, token, expiresInSeconds: TTL });
}
