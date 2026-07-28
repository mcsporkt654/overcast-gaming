/**
 * The admin session lives in an HttpOnly cookie, so whether someone is logged
 * in is a server-side fact. Exposing it through the layout means every admin
 * sub-page is gated by the same check and survives a full page navigation
 * between them (the old single-page admin held its token in a JS variable,
 * which a navigation would have thrown away).
 *
 * @type {import('./$types').LayoutServerLoad}
 */
export function load({ locals }) {
  return { admin: !!locals.admin };
}
