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

// The four truncated placeholder dispatches earlier versions seeded (one body
// paragraph, no image, no category). Replaced by the league's real articles —
// see `importRealPosts` below.
const PLACEHOLDER_POST_SLUGS = ['post-1', 'post-2', 'post-3', 'post-4'];

const DEMO_PLAYERS = [
  {
    slug: 'demo-auric-voss',
    name: 'Auric Voss',
    armies: ['Adeptus Custodes']
  },
  {
    slug: 'demo-mira-kane',
    name: 'Mira Kane',
    armies: ['Aeldari']
  },
  {
    slug: 'demo-helios-vale',
    name: 'Helios Vale',
    armies: ['Necrons']
  },
  {
    slug: 'demo-thane-rurik',
    name: 'Thane Rurik',
    armies: ['Space Marines']
  },
  {
    slug: 'demo-kael-drax',
    name: 'Kael Drax',
    armies: ['Orks']
  },
  {
    slug: 'demo-selene-wythe',
    name: 'Selene Wythe',
    armies: ['Chaos Space Marines']
  },
  {
    slug: 'demo-jax-orrin',
    name: 'Jax Orrin',
    armies: ["T'au Empire"]
  },
  {
    slug: 'demo-isolde-grimm',
    name: 'Isolde Grimm',
    armies: ['Death Guard']
  }
];

const DIVISION_PREMIER = 'Premier';
const DIVISION_STUMP = 'Stump';

const DETACHMENT_BY_ARMY = {
  'Adeptus Custodes': 'Shield Host',
  Aeldari: 'Battle Host',
  Necrons: 'Awakened Dynasty',
  'Space Marines': 'Gladius Task Force',
  Orks: 'War Horde',
  'Chaos Space Marines': 'Slaves to Darkness',
  "T'au Empire": 'Kauyon Cadre',
  'Death Guard': 'Plague Company'
};

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

  await upsertPosts('ON CONFLICT (id) DO NOTHING');

  console.log('[migrate] done.');
}

/**
 * Writes `data/posts.json` into `posts`.
 *
 * @param {string} conflictClause how to handle a row that already exists
 */
async function upsertPosts(conflictClause) {
  for (const p of postsData) {
    const slug = p.slug ?? p.id;
    await query(
      `INSERT INTO posts (id, slug, title, category, post_date, author, read_time, image, excerpt, body, highlights, gallery)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ${conflictClause}`,
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
}

/**
 * Replaces the placeholder dispatches with the league's real articles.
 *
 * The real posts used to live only in `static/news-data.js`, rendered
 * client-side; `/community` and `/news/[slug]` now read them from Postgres,
 * so they moved into `data/posts.json`. Existing databases were seeded with
 * four truncated placeholders under slugs `post-1`…`post-4`, which this
 * removes.
 */
async function importRealPosts() {
  await upsertPosts(`ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title,
       category = EXCLUDED.category,
       post_date = EXCLUDED.post_date,
       author = EXCLUDED.author,
       read_time = EXCLUDED.read_time,
       image = EXCLUDED.image,
       excerpt = EXCLUDED.excerpt,
       body = EXCLUDED.body,
       highlights = EXCLUDED.highlights,
       gallery = EXCLUDED.gallery`);

  const { rowCount } = await query(`DELETE FROM posts WHERE slug = ANY($1)`, [
    PLACEHOLDER_POST_SLUGS
  ]);
  console.log(`[migrate] imported ${postsData.length} real posts, removed ${rowCount} placeholders`);
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

async function ensureSeasonalSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS seasons (
      id           SERIAL PRIMARY KEY,
      season_year  INTEGER UNIQUE NOT NULL,
      label        TEXT NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS divisions (
      id          SERIAL PRIMARY KEY,
      season_id   INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      name        TEXT NOT NULL CHECK (name IN ('Premier', 'Stump')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (season_id, name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS detachments (
      id          SERIAL PRIMARY KEY,
      army_name   TEXT NOT NULL,
      name        TEXT NOT NULL,
      ruleset     TEXT NOT NULL DEFAULT 'WH40K',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (army_name, name, ruleset)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS season_player_divisions (
      id           SERIAL PRIMARY KEY,
      season_id    INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      division_id  INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
      player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      source       TEXT NOT NULL DEFAULT 'manual'
                     CHECK (source IN ('manual', 'rollover', 'seed')),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (season_id, player_id)
    )
  `);

  await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS mission_pack TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS division_id INTEGER REFERENCES divisions(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'league'`);
  await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS ruleset TEXT NOT NULL DEFAULT 'WH40K'`);
  await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS player_detachment_id INTEGER REFERENCES detachments(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS opponent_detachment_id INTEGER REFERENCES detachments(id) ON DELETE SET NULL`);

  await query(`
    ALTER TABLE matches
    DROP CONSTRAINT IF EXISTS matches_match_type_check
  `);
  await query(`
    ALTER TABLE matches
    ADD CONSTRAINT matches_match_type_check CHECK (match_type IN ('league', 'exhibition'))
  `);

  await query(`
    UPDATE matches m
    SET mission_pack = COALESCE(mi.mission_pack, '')
    FROM missions mi
    WHERE m.mission_id = mi.id AND COALESCE(m.mission_pack, '') = ''
  `);

  await query(`CREATE INDEX IF NOT EXISTS matches_season_id_idx ON matches (season_id)`);
  await query(`CREATE INDEX IF NOT EXISTS matches_division_id_idx ON matches (division_id)`);
  await query(`CREATE INDEX IF NOT EXISTS matches_match_type_idx ON matches (match_type)`);
}

async function ensureSeasonRows() {
  const years = [2026, 2027];
  for (const year of years) {
    await query(
      `INSERT INTO seasons (season_year, label)
       VALUES ($1, $2)
       ON CONFLICT (season_year)
       DO UPDATE SET label = EXCLUDED.label`,
      [year, `Season ${year}`]
    );
  }

  for (const year of years) {
    const { rows } = await query(`SELECT id FROM seasons WHERE season_year = $1`, [year]);
    const seasonId = rows[0]?.id;
    if (!seasonId) continue;
    await query(
      `INSERT INTO divisions (season_id, name)
       VALUES ($1, $2)
       ON CONFLICT (season_id, name) DO NOTHING`,
      [seasonId, DIVISION_PREMIER]
    );
    await query(
      `INSERT INTO divisions (season_id, name)
       VALUES ($1, $2)
       ON CONFLICT (season_id, name) DO NOTHING`,
      [seasonId, DIVISION_STUMP]
    );
  }
}

async function reseedDemoMatches() {
  await query(`DELETE FROM matches`);

  for (const player of DEMO_PLAYERS) {
    await query(
      `INSERT INTO players (slug, name, photo, armies, socials)
       VALUES ($1, $2, '', $3, '{}')
       ON CONFLICT (slug)
       DO UPDATE SET
         name = EXCLUDED.name,
         armies = EXCLUDED.armies`,
      [player.slug, player.name, player.armies]
    );
  }

  const { rows: playerRows } = await query(
    `SELECT id, slug, name, armies FROM players WHERE slug = ANY($1) ORDER BY slug`,
    [DEMO_PLAYERS.map((p) => p.slug)]
  );
  const playersBySlug = new Map(playerRows.map((row) => [row.slug, row]));

  const { rows: seasonRows } = await query(`SELECT id, season_year FROM seasons ORDER BY season_year`);
  const seasonByYear = new Map(seasonRows.map((row) => [row.season_year, row.id]));

  const { rows: divisionRows } = await query(
    `SELECT d.id, d.name, s.season_year
     FROM divisions d
     JOIN seasons s ON s.id = d.season_id`
  );
  const divisionByYearAndName = new Map(
    divisionRows.map((row) => [`${row.season_year}:${row.name}`, row.id])
  );

  const { rows: missionRows } = await query(
    `SELECT id, name, mission_pack FROM missions ORDER BY id`
  );
  if (!missionRows.length) return;

  for (const player of DEMO_PLAYERS) {
    const army = player.armies[0] || 'Space Marines';
    const detachment = DETACHMENT_BY_ARMY[army] || 'Core Detachment';
    await query(
      `INSERT INTO detachments (army_name, name, ruleset)
       VALUES ($1, $2, 'WH40K')
       ON CONFLICT (army_name, name, ruleset) DO NOTHING`,
      [army, detachment]
    );
  }

  const { rows: detachmentRows } = await query(
    `SELECT id, army_name, name, ruleset FROM detachments WHERE ruleset = 'WH40K'`
  );
  const detachmentIdByArmy = new Map(
    detachmentRows.map((row) => [row.army_name, row.id])
  );

  const premier = DEMO_PLAYERS.slice(0, 4);
  const stump = DEMO_PLAYERS.slice(4, 8);
  const leagueMatches = [];

  function addRoundRobin(entries, seasonYear, divisionName, startDay) {
    let dayOffset = startDay;
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        leagueMatches.push({
          seasonYear,
          divisionName,
          playerSlug: entries[i].slug,
          opponentSlug: entries[j].slug,
          matchType: 'league',
          dayOffset
        });
        dayOffset += 3;
      }
    }
    return dayOffset;
  }

  let day = addRoundRobin(premier, 2026, DIVISION_PREMIER, 0);
  day = addRoundRobin(stump, 2026, DIVISION_STUMP, day + 2);
  day = addRoundRobin(premier, 2027, DIVISION_PREMIER, day + 20);
  addRoundRobin(stump, 2027, DIVISION_STUMP, day + 22);

  const exhibitionMatches = [
    ['demo-auric-voss', 'demo-kael-drax', 2026, 18],
    ['demo-mira-kane', 'demo-selene-wythe', 2026, 27],
    ['demo-helios-vale', 'demo-jax-orrin', 2026, 33],
    ['demo-thane-rurik', 'demo-isolde-grimm', 2026, 39],
    ['demo-auric-voss', 'demo-jax-orrin', 2027, 95],
    ['demo-selene-wythe', 'demo-helios-vale', 2027, 108]
  ].map(([playerSlug, opponentSlug, seasonYear, dayOffset]) => ({
    seasonYear,
    divisionName: null,
    playerSlug,
    opponentSlug,
    matchType: 'exhibition',
    dayOffset
  }));

  const allMatches = [...leagueMatches, ...exhibitionMatches]
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .slice(0, 30);

  const baseDate = new Date('2026-01-08T00:00:00.000Z');

  let matchNumber = 1;
  for (const item of allMatches) {
    const player = playersBySlug.get(item.playerSlug);
    const opponent = playersBySlug.get(item.opponentSlug);
    if (!player || !opponent) continue;

    const playerArmy = Array.isArray(player.armies) && player.armies.length ? player.armies[0] : 'Space Marines';
    const opponentArmy = Array.isArray(opponent.armies) && opponent.armies.length ? opponent.armies[0] : 'Space Marines';
    const mission = missionRows[(matchNumber - 1) % missionRows.length];

    const date = new Date(baseDate);
    date.setUTCDate(baseDate.getUTCDate() + Number(item.dayOffset));
    const isoDate = date.toISOString().slice(0, 10);

    const playerPrimary = 30 + (matchNumber % 16);
    const playerSecondary = 16 + (matchNumber % 10);
    const playerDestruction = 8 + (matchNumber % 12);

    const opponentPrimary = 24 + ((matchNumber * 3) % 16);
    const opponentSecondary = 12 + ((matchNumber * 5) % 10);
    const opponentDestruction = 7 + ((matchNumber * 2) % 12);

    const playerVp = playerPrimary + playerSecondary + playerDestruction;
    const opponentVp = opponentPrimary + opponentSecondary + opponentDestruction;
    const pointsDiff = playerVp - opponentVp;
    const result = pointsDiff > 0 ? 'W' : pointsDiff < 0 ? 'L' : 'D';

    const seasonId = seasonByYear.get(item.seasonYear) || null;
    const divisionId = item.divisionName
      ? divisionByYearAndName.get(`${item.seasonYear}:${item.divisionName}`) || null
      : null;

    await query(
      `INSERT INTO matches (
        id, match_date, player_id, player_name,
        army_used, army_subfaction, army_points, player_units,
        opponent_name, opponent_army, opponent_subfaction, opponent_points, opponent_units,
        mission_id, mission_name, mission_pack, event_id, event_name,
        season_id, division_id, match_type, ruleset,
        player_detachment_id, opponent_detachment_id,
        primary_score_player, primary_score_opponent,
        secondary_score_player, secondary_score_opponent,
        destruction_score_player, destruction_score_opponent,
        result, points_diff, battle_notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29,$30,$31,$32,$33
      )`,
      [
        `demo-match-${String(matchNumber).padStart(3, '0')}`,
        isoDate,
        player.id,
        player.name,
        playerArmy,
        '',
        2000,
        JSON.stringify([]),
        opponent.name,
        opponentArmy,
        '',
        2000,
        JSON.stringify([]),
        mission.id,
        mission.name,
        mission.mission_pack || '',
        null,
        '',
        seasonId,
        divisionId,
        item.matchType,
        'WH40K',
        detachmentIdByArmy.get(playerArmy) || null,
        detachmentIdByArmy.get(opponentArmy) || null,
        playerPrimary,
        opponentPrimary,
        playerSecondary,
        opponentSecondary,
        playerDestruction,
        opponentDestruction,
        result,
        pointsDiff,
        `${item.matchType === 'league' ? 'League' : 'Exhibition'} demo match for season ${item.seasonYear}.`
      ]
    );

    matchNumber += 1;
  }

  await query(`DELETE FROM season_player_divisions`);
  await query(`
    INSERT INTO season_player_divisions (season_id, division_id, player_id, source)
    SELECT DISTINCT m.season_id, m.division_id, m.player_id, 'seed'
    FROM matches m
    WHERE m.match_type = 'league'
      AND m.season_id IS NOT NULL
      AND m.division_id IS NOT NULL
    ON CONFLICT (season_id, player_id)
    DO UPDATE SET
      division_id = EXCLUDED.division_id,
      source = EXCLUDED.source
  `);

  console.log(`[migrate] seeded ${matchNumber - 1} demo matches with season and division metadata`);
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
      await runOnce('2026-08-03-import-real-posts', importRealPosts);
      await runOnce('2026-08-23-seasonal-schema', ensureSeasonalSchema);
      await runOnce('2026-08-23-seasons-divisions', ensureSeasonRows);
      await runOnce('2026-08-23-reseed-demo-matches', reseedDemoMatches);
    })().catch((err) => {
      migrationPromise = null; // allow retry on the next request instead of caching a permanent failure
      throw err;
    });
  }
  return migrationPromise;
}
