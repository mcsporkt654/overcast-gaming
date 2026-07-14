/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
  const [statsRes, matchesRes] = await Promise.all([
    fetch('/api/stats'),
    fetch('/api/matches')
  ]);

  const apiUnavailable = statsRes.status === 503 || matchesRes.status === 503;
  const stats = statsRes.ok ? await statsRes.json() : null;
  const matches = matchesRes.ok ? await matchesRes.json() : [];

  return { stats, matches, apiUnavailable };
}
