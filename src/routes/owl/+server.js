import { redirect } from '@sveltejs/kit';

// The OWL standings and the match log are one page in the redesign.
export function GET() {
  redirect(301, '/stats#standings');
}
