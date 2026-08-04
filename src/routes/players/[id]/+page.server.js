import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, params }) {
  const res = await fetch(`/api/players/${encodeURIComponent(params.id)}/analytics`);

  if (res.status === 404) throw error(404, 'Player not found');
  if (res.status === 503) {
    return { analytics: null, apiUnavailable: true };
  }
  if (!res.ok) throw error(500, 'Could not load player analytics');

  return { analytics: await res.json(), apiUnavailable: false };
}
