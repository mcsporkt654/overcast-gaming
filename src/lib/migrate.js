import { query } from './db.js';

import schemaSql from '../../schema.sql?raw';
import armiesData from '../../data/armies.json';
import missionsData from '../../data/missions.json';
import eventsData from '../../data/events.json';
import playersData from '../../data/players.json';
import matchesData from '../../data/matches.json';
import postsData from '../../data/posts.json';

let migrationPromise = null;

async function seed() {
  console.log('[migrate] schema missing — applying schema.sql and seeding from data/*.json');

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

  const playerSlugToId = {};
  for (const p of playersData) {
    const result = await query(
      `INSERT INTO players (slug, name, photo, armies, socials)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [p.id, p.name, p.photo ?? '', p.armies ?? [], JSON.stringify(p.socials ?? {})]
    );
    playerSlugToId[p.id] = result.rows[0].id;
  }

  for (const m of matchesData) {
    const numericPlayerId = playerSlugToId[m.playerId];
    if (!numericPlayerId) continue;
    await query(
      `INSERT INTO matches (
         id, match_date, player_id, player_name,
         army_used, army_subfaction, army_points, player_units,
         opponent_name, opponent_army, opponent_subfaction, opponent_points, opponent_units,
         mission_id, mission_name, event_id, event_name,
         primary_score_player, primary_score_opponent,
         secondary_score_player, secondary_score_opponent,
         destruction_score_player, destruction_score_opponent,
         result, points_diff, battle_notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
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
 * Idempotent, self-healing bootstrap: applies schema.sql and seeds from
 * data/*.json the first time a table is missing, then no-ops on every
 * subsequent call for the life of the process. Runs on the app's own
 * runtime DATABASE_URL, so it needs no external tooling or connection
 * string to be shared out-of-band.
 */
export function ensureMigrated() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const { rows } = await query(`SELECT to_regclass('public.players') AS exists`);
      if (!rows[0]?.exists) {
        await seed();
      }
    })().catch((err) => {
      migrationPromise = null; // allow retry on the next request instead of caching a permanent failure
      throw err;
    });
  }
  return migrationPromise;
}
