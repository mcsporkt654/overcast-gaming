/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
  const res = await fetch('/api/players');
  const players = res.ok ? await res.json() : [];
  return { players };
}
