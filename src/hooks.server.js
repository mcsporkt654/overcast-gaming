import { verifyAdminToken, extractAdminToken } from '$lib/auth.js';
import { DatabaseUnavailableError, isDatabaseConnectionError } from '$lib/db.js';
import { ensureMigrated } from '$lib/migrate.js';

function databaseUnavailableResponse(event) {
  if (event.url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable. Please try again shortly.' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '30'
      }
    });
  }

  return new Response('Service temporarily unavailable. Please try again shortly.', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': '30'
    }
  });
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  // ── Admin auth — populate locals.admin before route handlers run ──────────
  const token = extractAdminToken(event);
  event.locals.admin = !!verifyAdminToken(token);

  // ── First-boot schema/seed bootstrap — no-ops once tables exist ───────────
  try {
    await ensureMigrated();
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError) && !isDatabaseConnectionError(error)) {
      console.error('[migrate] unexpected error during bootstrap', error);
    }
    // Fall through — the route handler's own db call will surface the
    // right error (503 for connection issues) via the withDb wrapper.
  }

  // ── Security headers (mirrors the old Express middleware) ─────────────────
  let response;
  try {
    response = await resolve(event);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError || isDatabaseConnectionError(error)) {
      response = databaseUnavailableResponse(event);
    } else {
      throw error;
    }
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
    "form-action 'self'; script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' https: data:; connect-src 'self'"
  );

  return response;
}

/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error, event }) {
  if (error instanceof DatabaseUnavailableError || isDatabaseConnectionError(error)) {
    console.error(`[${event.request.method}] ${event.url.pathname} database unavailable`, error);
    return { message: 'Service temporarily unavailable. Please try again shortly.' };
  }

  console.error(`[${event.request.method}] ${event.url.pathname}`, error);
  return { message: 'An unexpected error occurred.' };
}
