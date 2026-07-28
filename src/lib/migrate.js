import { query } from './db.js';

import schemaSql from '../../schema.sql?raw';
import armiesData from '../../data/armies.json';
import missionsData from '../../data/missions.json';
import eventsData from '../../data/events.json';
import postsData from '../../data/posts.json';

let migrationPromise = null;

// The 5 fake players the app used to seed itself with (and the matches that
// referenced them). Real players get a timestamp-based slug (`player-<Date.now()>`),
// so these five literals can never collide with a genuine roster entry.
const SEED_PLAYER_SLUGS = ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'];

/**
 * Reference + content seeds only. The roster (players) and match history are
 * deliberately NOT seeded — those are entered through the admin console, so a
 * fresh database starts with an empty roster rather than placeholder people.
 */
async function seed() {
  console.log('[migrate] schema missing — applying schema.sql and seeding reference data');

  await query(schemaSql);

  for (const army of armiesData) {
    await query(
      `INSERT INTO armies (name, subfactions, common_units)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING`,
      [army.name, army.subfactions ?? [], army.commonUnits ?? []]
    );
  }

  for (const m of missionsData) {
    await query(
      `INSERT INTO missions (id, name, mission_pack, primary_description, secondary_description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.name, m.missionPack ?? '', m.primaryDescription ?? '', m.secondaryDescription ?? '']
    );
  }

  for (const ev of eventsData) {
    await query(
      `INSERT INTO events (id, name, format, location, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [ev.id, ev.name, ev.format ?? '', ev.location ?? '', ev.startDate || null, ev.endDate || null, ev.notes ?? '']
    );
  }

  for (const p of postsData) {
    const slug = p.slug ?? p.id;
    await query(
      `INSERT INTO posts (id, slug, title, category, post_date, author, read_time, image, excerpt, body, highlights, gallery)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id,
        slug,
        p.title,
        p.category ?? 'Dispatch',
        p.date,
        p.author ?? '',
        p.readTime ?? '',
        p.image ?? '',
        p.excerpt ?? '',
        JSON.stringify(Array.isArray(p.body) ? p.body : [p.body].filter(Boolean)),
        JSON.stringify(p.highlights ?? []),
        JSON.stringify(p.gallery ?? [])
      ]
    );
  }

  console.log('[migrate] done.');
}

/**
 * Run a named migration step exactly once per database, tracked in
 * `schema_migrations`. Unlike `seed()` (which only fires on a brand-new
 * database), these run against databases that already have tables.
 *
 * @param {string} name
 * @param {() => Promise<void>} fn
 */
async function runOnce(name, fn) {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT        PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rowCount } = await query(
    `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [name]
  );
  if (!rowCount) return; // already applied

  try {
    await fn();
    console.log(`[migrate] applied ${name}`);
  } catch (error) {
    // Don't leave a claimed-but-failed step behind — let the next boot retry it.
    await query(`DELETE FROM schema_migrations WHERE name = $1`, [name]).catch(() => {});
    throw error;
  }
}

/**
 * Delete the placeholder roster (and its matches) that earlier versions of this
 * bootstrap inserted, so the league can build a real roster from an empty slate.
 * Matches go first — `matches.player_id` is ON DELETE RESTRICT.
 */
async function purgeSeedRoster() {
  const { rowCount: matchCount } = await query(
    `DELETE FROM matches
      WHERE player_id IN (SELECT id FROM players WHERE slug = ANY($1))`,
    [SEED_PLAYER_SLUGS]
  );
  const { rowCount: playerCount } = await query(`DELETE FROM players WHERE slug = ANY($1)`, [
    SEED_PLAYER_SLUGS
  ]);
  console.log(`[migrate] purged seed roster: ${playerCount} players, ${matchCount} matches`);
}

/**
 * Idempotent, self-healing bootstrap: applies schema.sql and seeds reference
 * data the first time a table is missing, then runs any pending one-off
 * migrations, then no-ops for the life of the process. Runs on the app's own
 * runtime DATABASE_URL, so it needs no external tooling or connection string
 * to be shared out-of-band.
 */
export function ensureMigrated() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const { rows } = await query(`SELECT to_regclass('public.players') AS exists`);
      if (!rows[0]?.exists) {
        await seed();
      }
      await runOnce('2026-07-27-purge-seed-roster', purgeSeedRoster);
    })().catch((err) => {
      migrationPromise = null; // allow retry on the next request instead of caching a permanent failure
      throw err;
    });
  }
  return migrationPromise;
}
