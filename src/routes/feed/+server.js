import { redirect } from '@sveltejs/kit';

// The community feed moved to /community.
export function GET() {
  redirect(301, '/community');
}
