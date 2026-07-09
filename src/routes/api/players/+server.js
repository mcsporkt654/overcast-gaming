import { query } from '$lib/db.js';
import { verifyAdminToken, extractAdminToken, signAdminToken, buildAdminCookie } from '$lib/auth.js';
import {
  normalizeString,
  normalizeHttpUrl,
  errorResponse,
  jsonResponse
} from '$lib/validation.js';

export async function GET() {
  const { rows: players } = await query(`
    SELECT
      p.id, p.slug, p.name, p.photo, p.armies, p.socials,
      COUNT(m.id)                                                   AS total,
      COUNT(m.id) FILTER (WHERE m.result = 'W')                    AS wins,
      COUNT(m.id) FILTER (WHERE m.result = 'L')                    AS losses,
      COUNT(m.id) FILTER (WHERE m.result = 'D')                    AS draws,
      CASE WHEN COUNT(m.id) > 0
        THEN ROUND(COUNT(m.id) FILTER (WHERE m.result = 'W') * 100.0 / COUNT(m.id))
        ELSE NULL
      END AS win_rate
    FROM players p
    LEFT JOIN matches m ON m.player_id = p.id
    GROUP BY p.id
    ORDER BY p.name
  `);

  const result = players.map((p) => ({
    id: p.slug,
    name: p.name,
    photo: p.photo,
    armies: p.armies,
    socials: p.socials,
    wins: Number(p.wins),
    losses: Number(p.losses),
    draws: Number(p.draws),
    total: Number(p.total),
    winRate: p.win_rate !== null ? Number(p.win_rate) : null
  }));

  return jsonResponse(result);
}

export async function POST({ request, cookies, locals }) {
  if (!locals.admin) return errorResponse('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body.');

  const { name, armies, photo, socials } = body;

  if (!name || !Array.isArray(armies)) {
    return errorResponse('Name and armies array are required.');
  }

  const cleanName = normalizeString(name, 80);
  if (!cleanName) return errorResponse('Name is required.');

  const cleanArmies = armies
    .map((a) => normalizeString(a, 80))
    .filter(Boolean)
    .slice(0, 12);

  if (!cleanArmies.length) return errorResponse('At least one valid army is required.');

  const allowedSocials = ['instagram', 'twitter', 'youtube', 'twitch', 'tiktok', 'discord', 'reddit', 'facebook'];
  const cleanSocials = {};
  if (socials && typeof socials === 'object') {
    allowedSocials.forEach((s) => {
      if (socials[s] && typeof socials[s] === 'string') {
        const normalized = normalizeHttpUrl(socials[s]);
        if (normalized) cleanSocials[s] = normalized;
      }
    });
  }

  const cleanPhoto = normalizeHttpUrl(photo);
  const slug = 'player-' + Date.now();

  const { rows } = await query(
    `INSERT INTO players (slug, name, photo, armies, socials)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, slug, name, photo, armies, socials`,
    [slug, cleanName, cleanPhoto, cleanArmies, JSON.stringify(cleanSocials)]
  );

  const p = rows[0];
  return jsonResponse({
    success: true,
    player: { id: p.slug, name: p.name, photo: p.photo, armies: p.armies, socials: p.socials }
  }, 201);
}
