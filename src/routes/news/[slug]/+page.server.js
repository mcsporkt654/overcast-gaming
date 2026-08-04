import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, params }) {
  const res = await fetch('/api/posts');

  if (res.status === 503) return { post: null, related: [], apiUnavailable: true };
  if (!res.ok) throw error(500, 'Could not load dispatches');

  const posts = await res.json();
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) throw error(404, 'Dispatch not found');

  // Same category first, then most recent.
  const related = posts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      const sameA = a.category === post.category ? 1 : 0;
      const sameB = b.category === post.category ? 1 : 0;
      if (sameA !== sameB) return sameB - sameA;
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, 3);

  return { post, related, apiUnavailable: false };
}
