/**
 * scripts/migrate-to-pg.js
 *
 * One-time migration from JSON flat files → PostgreSQL.
 * Run:  npm run migrate
 *
 * Requires DATABASE_URL in .env.
 * Safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function readJSON(relPath) {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, relPath), 'utf8'));
  } catch {
    return [];
  }
}

function readSQL(relPath) {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Apply schema ────────────────────────────────────────────────────
    console.log('Applying schema...');
    const schema = readSQL('schema.sql');
    await client.query(schema);

    // ── 2. Armies ──────────────────────────────────────────────────────────
    console.log('Seeding armies...');
    const armies = readJSON('data/armies.json');
    for (const army of armies) {
      await client.query(
        `INSERT INTO armies (name, subfactions, common_units)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [army.name, army.subfactions ?? [], army.commonUnits ?? []]
      );
    }
    console.log(`  → ${armies.length} armies`);

    // ── 3. Missions ────────────────────────────────────────────────────────
    console.log('Seeding missions...');
    const missions = readJSON('data/missions.json');
    for (const m of missions) {
      await client.query(
        `INSERT INTO missions (id, name, mission_pack, primary_description, secondary_description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.name, m.missionPack ?? '', m.primaryDescription ?? '', m.secondaryDescription ?? '']
      );
    }
    console.log(`  → ${missions.length} missions`);

    // ── 4. Events ──────────────────────────────────────────────────────────
    console.log('Seeding events...');
    const events = readJSON('data/events.json');
    for (const ev of events) {
      await client.query(
        `INSERT INTO events (id, name, format, location, start_date, end_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          ev.id,
          ev.name,
          ev.format ?? '',
          ev.location ?? '',
          ev.startDate || null,
          ev.endDate || null,
          ev.notes ?? ''
        ]
      );
    }
    console.log(`  → ${events.length} events`);

    // ── 5. Players ─────────────────────────────────────────────────────────
    console.log('Seeding players...');
    const players = readJSON('data/players.json');
    // slug → numeric id mapping for match FK resolution
    const playerSlugToId = {};
    for (const p of players) {
      const result = await client.query(
        `INSERT INTO players (slug, name, photo, armies, socials)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [p.id, p.name, p.photo ?? '', p.armies ?? [], JSON.stringify(p.socials ?? {})]
      );
      playerSlugToId[p.id] = result.rows[0].id;
    }
    console.log(`  → ${players.length} players`);

    // ── 6. Matches ─────────────────────────────────────────────────────────
    console.log('Seeding matches...');
    const matches = readJSON('data/matches.json');
    let skipped = 0;
    for (const m of matches) {
      const numericPlayerId = playerSlugToId[m.playerId];
      if (!numericPlayerId) {
        console.warn(`  ⚠  Skipping match ${m.id}: player "${m.playerId}" not found`);
        skipped++;
        continue;
      }
      await client.query(
        `INSERT INTO matches (
           id, match_date, player_id, player_name,
           army_used, army_subfaction, army_points, player_units,
           opponent_name, opponent_army, opponent_subfaction, opponent_points, opponent_units,
           mission_id, mission_name, event_id, event_name,
           primary_score_player, primary_score_opponent,
           secondary_score_player, secondary_score_opponent,
           destruction_score_player, destruction_score_opponent,
           result, points_diff, battle_notes
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
           $18,$19,$20,$21,$22,$23,$24,$25,$26
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          m.id,
          m.date,
          numericPlayerId,
          m.playerName ?? '',
          m.armyUsed,
          m.armySubfaction ?? '',
          m.armyPoints ?? null,
          JSON.stringify(m.playerUnits ?? []),
          m.opponentName,
          m.opponentArmy,
          m.opponentSubfaction ?? '',
          m.opponentPoints ?? null,
          JSON.stringify(m.opponentUnits ?? []),
          m.missionId || null,
          m.missionName ?? '',
          m.eventId || null,
          m.eventName ?? '',
          m.primaryScorePlayer ?? null,
          m.primaryScoreOpponent ?? null,
          m.secondaryScorePlayer ?? null,
          m.secondaryScoreOpponent ?? null,
          m.destructionScorePlayer ?? null,
          m.destructionScoreOpponent ?? null,
          m.result,
          m.pointsDiff ?? null,
          m.battleNotes ?? ''
        ]
      );
    }
    console.log(`  → ${matches.length - skipped} matches (${skipped} skipped)`);

    // ── 7. Posts ───────────────────────────────────────────────────────────
    console.log('Seeding posts...');
    const posts = readJSON('data/posts.json');
    for (const p of posts) {
      // Build a slug from the id or title if not present
      const slug = p.slug ?? p.id.replace(/^post-/, 'post-').replace(/\s+/g, '-').toLowerCase();
      await client.query(
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
    console.log(`  → ${posts.length} posts`);

    await client.query('COMMIT');
    console.log('\n✅  Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌  Migration failed, rolled back.');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
