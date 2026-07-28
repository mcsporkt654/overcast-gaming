# Overcast Wargaming League

Warhammer 40K league site for Portland, OR: roster, match stats/analytics,
league standings ("The OWL"), a community feed, and a password-protected
admin panel for entering players/matches/events.

## Stack

- **App server:** SvelteKit ([`@sveltejs/adapter-node`](https://svelte.dev/docs/kit/adapter-node)) — serves `/api/*`, the admin auth flow, and the Home/Roster/Stats routes
- **Frontend:** mid-migration. Home (`/`), Roster (`/roster`), and Stats (`/stats`) are real SvelteKit routes using shared [`Header`](src/lib/components/Header.svelte)/[`Footer`](src/lib/components/Footer.svelte) components. The remaining 8 pages are still hand-written HTML in [`static/`](static/) that duplicate the nav/footer and fetch data client-side — see "Known architecture debt" below
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
| `/` | SvelteKit route | Home + recent matches + stat tiles + rotating dispatch spotlight |
| `/roster` | SvelteKit route | Player roster + per-player analytics modal |
| `/stats` | SvelteKit route | Leaderboards, army win rates, filterable match log |
| `/feed` | static HTML | Community listing with category filters, card/timeline view |
| `/news?slug=...` | static HTML | Community article detail view |
| `/matchups` | static HTML | Faction-vs-faction matchup matrix |
| `/meta` | static HTML | Meta trends over time |
| `/owl` | static HTML | League standings |
| `/admin` | static HTML | Admin panel for entering players/matches/events |

There is no `/gallery` — the feature was removed (low user interest, and a
real Instagram auto-sync would require setting up a Meta Developer app).

The three SvelteKit routes still lean on the same working vanilla-JS
interactivity the static pages used (roster's player modal, stats' filters,
home's spotlight rotator) — that logic was extracted verbatim into
`static/{home,roster,stats}-page.js` and is loaded via a `<script src>` tag
from each page's `<svelte:head>`, rather than being rewritten as reactive
Svelte state. The port's actual scope was: kill route-shadowing (deleting the
static file is what activates the Svelte route, since adapter-node's static
file serving takes priority), share one Header/Footer instead of duplicating
nav/footer markup per file, and enable real per-page `<title>`/meta. It was
not a rewrite of already-working interactive behavior.

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
SvelteKit + Postgres. The database and API layers have fully moved over.
On the frontend, Home/Roster/Stats are now real SvelteKit routes (see
above); the remaining 8 pages (`feed`, `news`, `matchups`, `meta`, `owl`,
`admin`, `player`, `match-detail`) are still hand-written HTML in `static/`
that duplicate the nav/footer per file and fetch data client-side with no
SSR or per-page SEO metadata.

See [`documentation/APP_REVIEW_AND_ROADMAP.md`](documentation/APP_REVIEW_AND_ROADMAP.md)
for the full review and a phased plan to port the remaining static pages
into SvelteKit routes, along with performance and UX recommendations. (That
doc predates the gallery removal and the Home/Roster/Stats port — treat its
route list and page count as historical.)

`data/*.json` is seed data only, consumed by the first-boot migration and by
[`scripts/migrate-to-pg.js`](scripts/migrate-to-pg.js). Nothing reads or
writes it at runtime — all reads/writes go through Postgres.

Not affiliated with Games Workshop. Warhammer 40,000 copyright Games Workshop Ltd.
