import { query, withDb } from '$lib/db.js';
import { jsonResponse } from '$lib/validation.js';

export const GET = withDb(async () => {
  const { rows } = await query(`
    SELECT
      id,
      name,
      mission_pack AS "missionPack",
      primary_description AS "primaryDescription",
      secondary_description AS "secondaryDescription"
    FROM missions
    ORDER BY name
  `);
  return jsonResponse(rows);
});
