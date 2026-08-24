import { query, withDb } from '$lib/db.js';
import { errorResponse, jsonResponse, normalizeString } from '$lib/validation.js';

export const GET = withDb(async ({ url }) => {
  const armyName = normalizeString(url.searchParams.get('army') || '', 80);
  const ruleset = normalizeString(url.searchParams.get('ruleset') || 'WH40K', 40) || 'WH40K';

  const params = [ruleset];
  let armyFilter = '';
  if (armyName) {
    params.push(armyName);
    armyFilter = `AND army_name = $${params.length}`;
  }

  const { rows } = await query(
    `SELECT id, army_name AS "armyName", name, ruleset
     FROM detachments
     WHERE ruleset = $1
     ${armyFilter}
     ORDER BY army_name, name`,
    params
  );

  return jsonResponse(rows);
});

export const POST = withDb(async ({ request, locals }) => {
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body.');

  const armyName = normalizeString(body.armyName, 80);
  const name = normalizeString(body.name, 80);
  const ruleset = normalizeString(body.ruleset || 'WH40K', 40) || 'WH40K';

  if (!armyName || !name) {
    return errorResponse('armyName and name are required.');
  }

  const { rows } = await query(
    `INSERT INTO detachments (army_name, name, ruleset)
     VALUES ($1, $2, $3)
     ON CONFLICT (army_name, name, ruleset)
     DO UPDATE SET army_name = EXCLUDED.army_name
     RETURNING id, army_name AS "armyName", name, ruleset`,
    [armyName, name, ruleset]
  );

  return jsonResponse({ success: true, detachment: rows[0] }, 201);
});
