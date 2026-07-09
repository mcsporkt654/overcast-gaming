-- Overcast Gaming — PostgreSQL schema
-- Run once against a fresh database, or use scripts/migrate-to-pg.js which calls this.

-- ─── Players ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id          SERIAL        PRIMARY KEY,
  slug        TEXT          UNIQUE NOT NULL,   -- legacy string id, e.g. "player-1"
  name        TEXT          NOT NULL,
  photo       TEXT          NOT NULL DEFAULT '',
  armies      TEXT[]        NOT NULL DEFAULT '{}',
  socials     JSONB         NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── Armies (reference list with subfactions) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS armies (
  id              SERIAL  PRIMARY KEY,
  name            TEXT    UNIQUE NOT NULL,
  subfactions     TEXT[]  NOT NULL DEFAULT '{}',
  common_units    TEXT[]  NOT NULL DEFAULT '{}'
);

-- ─── Missions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id                      TEXT    PRIMARY KEY,   -- e.g. "mission-take-and-hold"
  name                    TEXT    NOT NULL,
  mission_pack            TEXT    NOT NULL DEFAULT '',
  primary_description     TEXT    NOT NULL DEFAULT '',
  secondary_description   TEXT    NOT NULL DEFAULT ''
);

-- ─── Events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          TEXT          PRIMARY KEY,   -- e.g. "event-1234567890"
  name        TEXT          NOT NULL,
  format      TEXT          NOT NULL DEFAULT '',
  location    TEXT          NOT NULL DEFAULT '',
  start_date  DATE,
  end_date    DATE,
  notes       TEXT          NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── Matches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id                          TEXT          PRIMARY KEY,   -- e.g. "match-1234567890"
  match_date                  DATE          NOT NULL,
  player_id                   INTEGER       NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_name                 TEXT          NOT NULL,      -- denormalized for read performance
  army_used                   TEXT          NOT NULL,
  army_subfaction             TEXT          NOT NULL DEFAULT '',
  army_points                 INTEGER,
  player_units                JSONB         NOT NULL DEFAULT '[]',
  opponent_name               TEXT          NOT NULL,
  opponent_army               TEXT          NOT NULL,
  opponent_subfaction         TEXT          NOT NULL DEFAULT '',
  opponent_points             INTEGER,
  opponent_units              JSONB         NOT NULL DEFAULT '[]',
  mission_id                  TEXT          REFERENCES missions(id) ON DELETE SET NULL,
  mission_name                TEXT          NOT NULL DEFAULT '',
  event_id                    TEXT          REFERENCES events(id) ON DELETE SET NULL,
  event_name                  TEXT          NOT NULL DEFAULT '',
  primary_score_player        INTEGER,
  primary_score_opponent      INTEGER,
  secondary_score_player      INTEGER,
  secondary_score_opponent    INTEGER,
  destruction_score_player    INTEGER,
  destruction_score_opponent  INTEGER,
  result                      CHAR(1)       NOT NULL CHECK (result IN ('W', 'L', 'D')),
  points_diff                 INTEGER,
  battle_notes                TEXT          NOT NULL DEFAULT '',
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS matches_player_id_idx   ON matches (player_id);
CREATE INDEX IF NOT EXISTS matches_match_date_idx  ON matches (match_date DESC);
CREATE INDEX IF NOT EXISTS matches_army_used_idx   ON matches (army_used);

-- ─── Posts (community dispatches) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id          TEXT          PRIMARY KEY,   -- e.g. "post-1"
  slug        TEXT          UNIQUE NOT NULL,
  title       TEXT          NOT NULL,
  category    TEXT          NOT NULL DEFAULT 'Dispatch',
  post_date   DATE          NOT NULL,
  author      TEXT          NOT NULL DEFAULT '',
  read_time   TEXT          NOT NULL DEFAULT '',
  image       TEXT          NOT NULL DEFAULT '',
  excerpt     TEXT          NOT NULL DEFAULT '',
  body        JSONB         NOT NULL DEFAULT '[]',   -- array of paragraph strings
  highlights  JSONB         NOT NULL DEFAULT '[]',
  gallery     JSONB         NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS posts_post_date_idx ON posts (post_date DESC);
