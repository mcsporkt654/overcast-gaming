import { extractAdminToken, revokeAdminToken } from '$lib/auth.js';
import { errorResponse, jsonResponse } from '$lib/validation.js';

export async function POST(event) {
  const { locals, cookies } = event;
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  revokeAdminToken(extractAdminToken(event));
  cookies.delete('overcast_admin', { path: '/' });
  return jsonResponse({ success: true });
}
