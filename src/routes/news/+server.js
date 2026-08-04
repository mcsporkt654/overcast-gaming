import { redirect } from '@sveltejs/kit';

// Legacy query-param article URLs (/news?slug=x) now live at /news/x.
export function GET({ url }) {
  const slug = url.searchParams.get('slug');
  redirect(301, slug ? `/news/${encodeURIComponent(slug)}` : '/community');
}
