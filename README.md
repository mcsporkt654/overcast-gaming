# Overcast Wargaming League

Warhammer 40K league site for Portland, OR: roster, match stats/analytics,
league standings ("The OWL"), a community feed, and a password-protected
admin panel for entering players/matches/events.

## Stack

- **App server:** SvelteKit ([`@sveltejs/adapter-node`](https://svelte.dev/docs/kit/adapter-node)) — serves `/api/*`, the admin auth flow, and every public page
- **Frontend:** SvelteKit routes rendering server-side from their `load` data, with shared [`Header`](src/lib/components/Header.svelte)/[`Footer`](src/lib/components/Footer.svelte) components. Two pages (`/matchups`, `/meta`) are still hand-written HTML in [`static/`](static/) — see "Known architecture debt" below
- **Design system:** [`src/lib/styles/overcast.css`](src/lib/styles/overcast.css) ("Modernist × Nocturne" — flat 2px grid, Void + Arc Cyan, no rounded corners), imported once from the root layout. `static/style.css` is the *old* system, kept only for the two remaining static pages and the admin console
- **Database:** PostgreSQL (schema in [`schema.sql`](schema.sql))
- **Auth:** admin password → signed JWT, stored as an HttpOnly cookie ([`src/lib/auth.js`](src/lib/auth.js))
- **Hosting:** [Render](https://render.com) — one web service + one managed Postgres instance

## Quick start

```bash
npm install          # also runs `npm run build` via postinstall
cp .env.example .env # fill in DATABASE_URL, ADMIN_PASSWORD, JWT_SECRET
npm run dev
```

Local URL: http://localhost:3459

You need a real Postgres database — either a local instance or the
**external** connection string from your Render Postgres dashboard. On first
request, the app automatically applies [`schema.sql`](schema.sql) and seeds
from [`data/*.json`](data/) if the `players` table doesn't exist yet
(see [`src/lib/migrate.js`](src/lib/migrate.js)); this is idempotent, so it's
safe on every boot.

## Commands

```bash
npm run dev      # local dev server (vite)
npm run build    # production build → build/
npm start        # run the production build (build/index.js)
npm run migrate  # one-time/standalone schema+seed script (scripts/migrate-to-pg.js) — usually unnecessary, see above
npm test         # smoke test + API integration test (scripts/*.js)
```

## Routes

| Route | Implementation | Purpose |
| --- | --- | --- |
| `/` | SvelteKit route | Hero, results ticker, stat band, live standings, recent battles, news, partners, merch |
| `/roster` | SvelteKit route | Player cards with faction filter |
| `/stats` | SvelteKit route | Standings (`#standings`) + filterable match log (`#matches`) + faction breakdown |
| `/community` | SvelteKit route | Dispatch feed, read from the `posts` table |
| `/news/[slug]` | SvelteKit route | Dispatch detail, with per-post OG/Twitter tags |
| `/players/[id]` | SvelteKit route | Commander profile: record, faction/subfaction splits, battle history |
| `/matches/[id]` | SvelteKit route | Battle record: objective breakdown, key units, notes |
| `/matchups` | static HTML | Faction-vs-faction matchup matrix |
| `/meta` | static HTML | Meta trends over time |
| `/admin` | SvelteKit route | Admin console — cookie-gated hub with `/admin/roster` (add players, live photo preview) and `/admin/match` (record results) sub-pages |

Retired URLs 301 to their replacements (see `src/routes/*/+server.js`):
`/owl` → `/stats#standings`, `/feed` → `/community`, `/news?slug=x` → `/news/x`,
`/player?id=x` → `/players/x`, `/match-detail?id=x` → `/matches/x`.

There is no `/gallery` — the feature was removed (low user interest, and a
real Instagram auto-sync would require setting up a Meta Developer app).

**Victory points are derived, not stored.** The schema has no VP column, so
[`src/lib/vp.js`](src/lib/vp.js) (and the `standings` query in
[`/api/stats`](src/routes/api/stats/+server.js)) sums each side's
primary + secondary + destruction scores. That's what ranks the standings and
fills the "Pts Diff" column.

All data-backed routes call `/api/*` (see [`src/routes/api/`](src/routes/api/)),
which reads/writes Postgres via [`src/lib/db.js`](src/lib/db.js).

## Environment variables

See [`.env.example`](.env.example). All three are required for the app to
function:

- `DATABASE_URL` — Postgres connection string
- `ADMIN_PASSWORD` — checked server-side only, never sent to the client
- `JWT_SECRET` — signs the admin session JWT

**If you rotate `ADMIN_PASSWORD` or `JWT_SECRET`, do it via the Render
dashboard's Environment tab (or the Render API), not by editing a file that
gets committed.** SvelteKit's `$env/dynamic/private` (used throughout this
app) reads these at runtime and never bakes them into the build output.

## Deploying

Render web service build command is `npm install` — the SvelteKit build runs
automatically via the `postinstall` script in `package.json`, so `build/` is
never committed to git (`build/` is gitignored). Start command is `npm start`.

See [`documentation/render_fullstack_info.md`](documentation/render_fullstack_info.md)
for the original Render setup walkthrough (web service + managed Postgres).

## Known architecture debt

This app is mid-migration from an older Express + flat-JSON prototype to
SvelteKit + Postgres. The database and API layers have fully moved over, and
so has every public page except two: `matchups` and `meta` are still
hand-written HTML in `static/`, with their own copy of the nav/footer, their
own client-side fetching, no SSR or per-page SEO metadata, and the *old*
stylesheet — so they look like the previous design.

The admin console is a SvelteKit route but still uses `static/style.css`
component classes, which `src/routes/admin/+layout.svelte` loads for that
subtree only. **Because `style.css` styles the bare `nav` and `footer`
elements, any `<nav>` inside a page inherits it** — that's why the shared
header's link list and the admin tab strip are both `<div role="navigation">`.

See [`documentation/APP_REVIEW_AND_ROADMAP.md`](documentation/APP_REVIEW_AND_ROADMAP.md)
for the full review, current progress against it, and a phased plan for the
remaining static pages — its **Status** section at the top is kept current
and is the best place to reorient a new session on this project. The rest of
that document is the original point-in-time review (July 17, 2026) and
should be read as historical narrative, not current state, except where the
Status section says otherwise.

`data/*.json` is seed data only, consumed by the first-boot migration and by
[`scripts/migrate-to-pg.js`](scripts/migrate-to-pg.js). Nothing reads or
writes it at runtime — all reads/writes go through Postgres.

Not affiliated with Games Workshop. Warhammer 40,000 copyright Games Workshop Ltd.
