import { query } from '$lib/db.js';
import {
  normalizeString,
  isIsoDate,
  errorResponse,
  jsonResponse
} from '$lib/validation.js';

export async function GET() {
  const { rows } = await query(`
    SELECT
      id, name, format, location,
      TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate",
      TO_CHAR(end_date,   'YYYY-MM-DD') AS "endDate",
      notes
    FROM events
    ORDER BY start_date DESC NULLS LAST, created_at DESC
  `);
  return jsonResponse(rows);
}

export async function POST({ request, locals }) {
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body.');

  const { name, format, location, startDate, endDate, notes } = body;

  const cleanName = normalizeString(name, 120);
  if (!cleanName) return errorResponse('Event name is required.');
  if (startDate && !isIsoDate(startDate)) return errorResponse('startDate must be YYYY-MM-DD.');
  if (endDate && !isIsoDate(endDate)) return errorResponse('endDate must be YYYY-MM-DD.');

  const newId = 'event-' + Date.now();
  const { rows } = await query(
    `INSERT INTO events (id, name, format, location, start_date, end_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, name, format, location,
       TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate",
       TO_CHAR(end_date,   'YYYY-MM-DD') AS "endDate",
       notes`,
    [
      newId,
      cleanName,
      normalizeString(format, 80),
      normalizeString(location, 120),
      startDate || null,
      endDate || null,
      normalizeString(notes, 1000)
    ]
  );

  return jsonResponse({ success: true, event: rows[0] }, 201);
}
