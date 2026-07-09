/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
  const [statsRes, matchesRes] = await Promise.all([
    fetch('/api/stats'),
    fetch('/api/matches')
  ]);

  const stats = statsRes.ok ? await statsRes.json() : null;
  const matches = matchesRes.ok ? await matchesRes.json() : [];

  return { stats, recentMatches: matches.slice(0, 10) };
}
