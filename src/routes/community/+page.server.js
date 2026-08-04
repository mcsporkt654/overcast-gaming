/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
  const res = await fetch('/api/posts');
  const apiUnavailable = res.status === 503;
  const posts = res.ok ? await res.json() : [];
  return { posts, apiUnavailable };
}
