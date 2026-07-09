import { errorResponse, jsonResponse } from '$lib/validation.js';

export async function POST({ locals, cookies }) {
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  cookies.delete('overcast_admin', { path: '/' });
  return jsonResponse({ success: true });
}
