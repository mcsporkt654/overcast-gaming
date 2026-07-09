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
      id, slug, title, category,
      TO_CHAR(post_date, 'YYYY-MM-DD') AS date,
      author, read_time AS "readTime", image, excerpt,
      body, highlights, gallery
    FROM posts
    ORDER BY post_date DESC
  `);
  return jsonResponse(rows);
}

export async function POST({ request, locals }) {
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body.');

  const { title, category, date, author, readTime, image, excerpt, bodyContent, highlights, gallery, slug } = body;

  const cleanTitle = normalizeString(title, 200);
  if (!cleanTitle) return errorResponse('title is required.');
  if (!date || !isIsoDate(date)) return errorResponse('date must be YYYY-MM-DD.');

  const cleanSlug = normalizeString(slug || title, 200)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const newId = 'post-' + Date.now();
  const { rows } = await query(
    `INSERT INTO posts (id, slug, title, category, post_date, author, read_time, image, excerpt, body, highlights, gallery)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id, slug, title, category,
       TO_CHAR(post_date, 'YYYY-MM-DD') AS date,
       author, read_time AS "readTime", image, excerpt, body, highlights, gallery`,
    [
      newId, cleanSlug, cleanTitle,
      normalizeString(category, 80) || 'Dispatch',
      date,
      normalizeString(author, 120),
      normalizeString(readTime, 40),
      normalizeString(image, 300),
      normalizeString(excerpt, 500),
      JSON.stringify(Array.isArray(bodyContent) ? bodyContent : [bodyContent].filter(Boolean)),
      JSON.stringify(Array.isArray(highlights) ? highlights : []),
      JSON.stringify(Array.isArray(gallery) ? gallery : [])
    ]
  );

  return jsonResponse({ success: true, post: rows[0] }, 201);
}
