# Overcast Wargaming League

Warhammer 40K league site for Portland, OR: roster, match stats/analytics,
league standings ("The OWL"), a community feed, and a password-protected
admin panel for entering players/matches/events.

## Stack

- **App server:** SvelteKit ([`@sveltejs/adapter-node`](https://svelte.dev/docs/kit/adapter-node)) — serves `/api/*` and the admin auth flow
- **Frontend:** static HTML/CSS/JS in [`static/`](static/) (13 hand-written pages fetching from `/api/*` client-side; not yet ported into Svelte routes — see "Known architecture debt" below)
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

| Route | Purpose |
| --- | --- |
| `/` | Home + recent matches + stat tiles + rotating dispatch spotlight |
| `/feed` | Community listing with category filters, card/timeline view |
| `/news?slug=...` | Community article detail view |
| `/roster` | Player roster |
| `/stats` | Leaderboards and match stat views |
| `/matchups` | Faction-vs-faction matchup matrix |
| `/meta` | Meta trends over time |
| `/gallery` | Community media gallery |
| `/owl` | League standings |
| `/admin` | Admin panel for entering players/matches/events |

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
SvelteKit + Postgres. The database and API layers have fully moved over, but
the **frontend has not**: the 13 pages in `static/` are hand-written HTML
that duplicate the nav/footer on every page and fetch data client-side
(no SSR, no per-page SEO metadata). Three SvelteKit routes already exist
(`src/routes/+page.svelte`, `roster/`, `stats/`) but are currently shadowed
by the static files of the same name and are not live.

See [`documentation/APP_REVIEW_AND_ROADMAP.md`](documentation/APP_REVIEW_AND_ROADMAP.md)
for the full review and a phased plan to port the remaining static pages
into SvelteKit routes, along with performance and UX recommendations.

`data/*.json` is seed data only, consumed by the first-boot migration and by
[`scripts/migrate-to-pg.js`](scripts/migrate-to-pg.js). Nothing reads or
writes it at runtime — all reads/writes go through Postgres.

Not affiliated with Games Workshop. Warhammer 40,000 copyright Games Workshop Ltd.
