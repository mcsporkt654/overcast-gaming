/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
  const [playersRes, statsRes] = await Promise.all([fetch('/api/players'), fetch('/api/stats')]);

  const apiUnavailable = playersRes.status === 503 || statsRes.status === 503;
  const players = playersRes.ok ? await playersRes.json() : [];
  const stats = statsRes.ok ? await statsRes.json() : null;

  // Roster cards show victory points, which only the standings query derives.
  const vpByPlayer = new Map((stats?.standings ?? []).map((s) => [s.id, s.totalVp]));

  return {
    players: players.map((p) => ({ ...p, totalVp: vpByPlayer.get(p.id) ?? 0 })),
    apiUnavailable
  };
}
