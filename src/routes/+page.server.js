/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
  const [statsRes, matchesRes, postsRes] = await Promise.all([
    fetch('/api/stats'),
    fetch('/api/matches'),
    fetch('/api/posts')
  ]);

  const apiUnavailable =
    statsRes.status === 503 || matchesRes.status === 503 || postsRes.status === 503;

  const stats = statsRes.ok ? await statsRes.json() : null;
  const matches = matchesRes.ok ? await matchesRes.json() : [];
  const posts = postsRes.ok ? await postsRes.json() : [];

  return {
    stats,
    // The homepage teaser needs 5 battles, the ticker 5 results.
    recentMatches: matches.slice(0, 10),
    // One featured dispatch beside two stacked cards.
    posts: posts.slice(0, 3),
    apiUnavailable
  };
}
