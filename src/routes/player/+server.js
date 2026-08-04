import { redirect } from '@sveltejs/kit';

// Legacy /player?id=x → /players/x.
export function GET({ url }) {
  const id = url.searchParams.get('id');
  redirect(301, id ? `/players/${encodeURIComponent(id)}` : '/roster');
}
