import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, params }) {
  const res = await fetch(`/api/matches/${encodeURIComponent(params.id)}`);

  if (res.status === 404) throw error(404, 'Match not found');
  if (res.status === 503) return { match: null, apiUnavailable: true };
  if (!res.ok) throw error(500, 'Could not load match detail');

  return { match: await res.json(), apiUnavailable: false };
}
