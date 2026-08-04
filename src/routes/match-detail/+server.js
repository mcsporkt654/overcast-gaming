import { redirect } from '@sveltejs/kit';

// Legacy /match-detail?id=x → /matches/x.
export function GET({ url }) {
  const id = url.searchParams.get('id');
  redirect(301, id ? `/matches/${encodeURIComponent(id)}` : '/stats#matches');
}
