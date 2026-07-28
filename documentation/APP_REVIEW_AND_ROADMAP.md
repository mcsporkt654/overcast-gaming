# Overcast Wargaming League — Full App Review & Execution Roadmap

**Reviewed:** July 17, 2026
**Reviewer:** Claude (full codebase read, local run of the production build, live production probing on Render, and production database inspection)
**Audience:** This document is written to be handed to an AI coding agent (or a human) to execute. Every finding includes file paths and concrete acceptance criteria.

---

## Status (updated 2026-07-27 — read this first)

**Phase 0 (security + get production working) and Phase 1 (repo hygiene) are complete**, plus a first slice of Phase 2. Everything below the Status section describes the *original* review from July 17 — treat any claim of a currently-broken/insecure state as historical unless it's echoed here.

**Done:**
- **§4.1 Admin password leak** — rotated (new password on Render + local `.env`), root cause fixed (`$env/dynamic/private` instead of `$env/static/private`), and the old password purged from *all* git history (including a `.svelte-kit/output/` leak this review missed, plus plaintext mentions in old `server.js`/`README.md`) with `git filter-repo` + force-push.
- **§4.2 Empty production DB** — fixed differently than planned: instead of manually running `scripts/migrate-to-pg.js` against an external connection string (no tool exposed one), built a self-healing migration (`src/lib/migrate.js`) that applies `schema.sql` + seeds `data/*.json` automatically on first boot if `players` doesn't exist. Confirmed live: 5 players, 50 matches in production Postgres.
- **§4.3 Dead 503 path** — fixed with a `withDb()` wrapper (`src/lib/db.js`) applied to every DB-backed `+server.js` handler. Confirmed: `/api/*` returns real 503+`Retry-After` with DB down, not a generic 500.
- **§4.4 Committed `build/`** — fixed via a `postinstall` script (`npm run build` runs automatically on Render's `npm install`) instead of a Render dashboard build-command change (no tool access to the dashboard). `build/` is gitignored and untracked.
- **Phase 0.8 health endpoint** — added (`/api/health`). **Not done: Render's `healthCheckPath` dashboard setting** — no available tool exposes this; needs a manual dashboard visit (Service → Settings → Health Check Path → `/api/health`).
- **Phase 1.1, 1.2, 1.4** — dead Express stack deleted (`server.js`, `public/`), README rewritten, `engines.node` bumped to `>=20`.
- **Not done: Phase 1.3** (IP allowlist restriction, switch to internal DB connection string) — deliberately skipped; restricting the `0.0.0.0/0` allowlist risked locking out access without knowing all the user's IPs. Still using the external connection string with `rejectUnauthorized: false`. Worth revisiting with the user's input.
- **Phase 2, first slice**: Home (`/`), Roster (`/roster`), and Stats (`/stats`) ported to real SvelteKit routes (Phase 2 list items 1–3 below). Gallery (`/gallery`) was **removed** rather than ported — see below.
- **Extra fixes made along the way, not in the original review**: a real logout bug (JWTs are stateless, so "logout" only cleared the cookie, leaving the token valid via the legacy header for up to 8h more — added a revocation list in `src/lib/auth.js`); both `scripts/*.js` test files used CommonJS `require()` in an ESM package and were never actually runnable — renamed to `.cjs` and repointed at the current stack; removed a dead theme-switcher script from `src/app.html` (no UI ever used it; it caused a `hydration_mismatch` console warning once real SvelteKit routes started hydrating in production — see "Known non-blocking issue" below).

**Product decision made mid-session:** Gallery (`/gallery`) was **removed**, not ported. The user asked whether it could pull real content from Instagram instead of shipping a placeholder gallery; a live auto-sync would require the user to set up a Meta Developer app (Business account, linked Facebook Page, app review) — out of scope for an agent to do unattended, and the user declined that setup rather than take it on. There is no `/gallery` route or nav link anymore, in `static/*.html`, `Header.svelte`, or this document's own recommendations below. **If asked to "finish porting the gallery page," stop and check with the user first — it was deliberately cut, not forgotten.**

**Still open (Phase 2 continued):** 7 pages remain static HTML: `feed`, `news`, `matchups`, `meta`, `owl`, `player`, `match-detail`. Same page-by-page pattern applies — pick up at Phase 2 list item 4 below, using the recipe in "Porting pattern established" below.

### Roster bootstrap + admin console rebuild (2026-07-27, later session)

The league is now entering its **real** roster, so the placeholder data is gone and the admin console was rebuilt around that workflow.

- **Seed roster removed.** `data/players.json` and `data/matches.json` are deleted, and `src/lib/migrate.js` no longer seeds players or matches — a fresh database now starts with an empty roster. Armies, missions, events, and the 5 community posts are still seeded (armies/missions are reference data that powers the admin dropdowns).
- **Existing production seed rows are purged automatically.** `migrate.js` gained a `runOnce()` helper backed by a new `schema_migrations` table, plus a step (`2026-07-27-purge-seed-roster`) that deletes the 5 known seed players (slugs `player-1`…`player-5`) and their matches on the next boot, once. Real entries get timestamp-based slugs (`player-<Date.now()>`), so they can never be caught by it. Unlike `seed()`, `runOnce()` steps run against databases that already have tables — this is the mechanism to reuse for any future data migration, since no tool in this environment exposes the Postgres connection string.
- **`static/admin.html` is ported and deleted**, and split into sub-pages:
  - `src/routes/admin/+layout.server.js` — the auth gate. The admin session was already an HttpOnly cookie, so login state is a server-side fact (`locals.admin`) exposed through the layout. **This is what makes sub-pages possible**: the old page held its JWT in a JS variable, which any navigation would have discarded.
  - `src/routes/admin/+layout.svelte` — login card when logged out; header, logout, and the tab strip when logged in.
  - `src/routes/admin/+page.svelte` (hub), `admin/roster` (add a player), `admin/match` (record a match).
- **Written as real Svelte, not extracted vanilla JS** — a deliberate departure from the porting recipe above. That recipe exists to avoid rewriting *working data-rendering* interactivity; these are forms whose auth had to move server-side anyway, and reactive state means nothing mutates the DOM behind Svelte's back (no hydration-mismatch risk). Verified: zero console messages on both sub-pages.
- **Photo preview + Google Drive tooltip** (`admin/roster`): a live preview of the public photo URL with explicit loads/failed states, and a `?` toggle explaining how to host a photo on Drive. `src/lib/photoUrl.js` rewrites Drive share links (`/file/d/<ID>/view`, `?id=<ID>`) into `drive.google.com/thumbnail?id=<ID>&sz=w1000`, because a raw share link is a viewer *page* and renders nothing in an `<img>`. Applied client-side (so the preview is honest) **and** in `POST /api/players` (so the stored value is right regardless of caller).
- **Gotcha worth remembering:** `static/style.css` styles the bare `nav` element (sticky, own background, `z-index:100`) for the site header. Any `<nav>` inside a page inherits all of it. The admin tab strip is a `<div role="navigation">` for that reason.
- **Not built (deliberate scope call):** there is no way to *edit or delete* a roster entry from the console — a typo currently needs a DB fix. Worth adding a `DELETE /api/players/[id]` plus a control on the roster list next.
- **Note on local verification:** local dev has no `DATABASE_URL`, so `/api/*` returns 503 and the admin pages fall back gracefully (hard-coded army list, empty roster, "no players yet" notice on the match form). The authenticated views were verified locally by temporarily forcing the layout guard open rather than typing the admin password into the browser; the override was reverted and all three `/admin*` routes re-checked to confirm they serve only the login screen when logged out.

**Known non-blocking issue:** a `hydration_mismatch` console warning appears on `/`, `/roster`, and `/stats` in production, with **zero functional impact** — confirmed via repeated interactive testing (player modal, stats filters, spotlight rotator all work correctly with real data on every deploy). Root cause not fully identified: removing the dead theme-switcher script (a legitimate fix in its own right) did not clear it. Worth a proper Svelte dev-mode investigation before porting more pages, since whatever's causing it will likely still be there.

### Porting pattern established (reuse for the remaining 8 pages)

Each of the 3 ported pages followed this recipe:

1. Move the page's nav/footer into the shared `Header`/`Footer` components (`src/lib/components/`) — already done, this step doesn't repeat.
2. Copy the page's markup (everything between the old `<nav>` and `<footer>`) into a new `src/routes/<name>/+page.svelte`, using `<svelte:head>` for `<title>` and meta tags.
3. Extract the page's inline `<script>` **verbatim** into `static/<name>-page.js` — do **not** rewrite the working vanilla-JS interactivity as reactive Svelte state. That's a much bigger, riskier job than what's actually broken here (route-shadowing, duplicated chrome, no SSR/meta).
4. Reference it via `<script src="/<name>-page.js" defer></script>` inside the page's `<svelte:head>`.
5. **Critical — don't skip this:** wrap the entire contents of `<name>-page.js` in `window.addEventListener('load', function () { ... })`. Scripts declared in `<svelte:head>` execute *before* SvelteKit's own body-placed hydration script (both are `defer`; head content comes first in document order). Without the wrapper, the extracted script mutates the DOM, then Svelte's hydration runs afterward, detects the live DOM no longer matches its server-rendered snapshot, and silently reverts the mutation back to the placeholder ("Loading...", "Summoning warriors...", etc.) — data fetches successfully but the page never shows it. This shipped to production once before being caught (the stats leaderboard stayed stuck on "Loading..." despite `/api/stats` returning 200) and fixed. Any inner `document.addEventListener('DOMContentLoaded', ...)` wrapper inside the extracted script needs to become plain immediately-invoked code, since `DOMContentLoaded` has already fired by the time `load` fires.
6. `git rm` the shadowing `static/<name>.html` — deleting it is literally what activates the Svelte route (adapter-node's static file serving takes priority over a SvelteKit route at the same path).
7. Build, run `node scripts/smoke-test.cjs` (update its file lists for the newly-deleted/added files), then verify **interactively in the browser against production** — local dev has no `DATABASE_URL` configured, so meaningful interactive testing (does the modal/filter/etc. actually populate with real data?) needs the deployed site, not local.

### Operational notes for future sessions

- **This environment auto-commits and auto-pushes working-tree changes in the background**, using its own generated commit messages that aren't always accurate (e.g. one commit here is titled "Fixed photo size issue with loadtime" but its actual diff is the Gallery removal). Don't be alarmed by commits you don't recognize writing.
- **No tool in this environment can change Render's dashboard-only settings** (build command, health check path) — `mcp__render__update_web_service` is unavailable here. Where a dashboard change was needed, a code-level workaround was used where possible (e.g. a `postinstall` script instead of changing the build command); where it wasn't possible (health check path), it's flagged above as a manual follow-up for the user.
- **No tool exposes the Postgres connection string** either (`mcp__render__query_render_postgres` is read-only). Where a migration was needed, it was done via a self-healing bootstrap that runs on the app's own runtime `DATABASE_URL` (`src/lib/migrate.js`) rather than requiring the connection string out-of-band.

---

## 0. Executive summary

The site's design and content direction are genuinely good — the brand, dark theme, and page layouts are polished and cohesive. But the app is currently **live and broken in production**, carries **three overlapping frontend/backend stacks** in one repo, and has **one urgent security leak**.

**The four things that matter most, in order:**

1. **🔴 SECURITY — The admin password is leaked in a public GitHub repo.** The literal password string is baked into the committed build artifact `build/server/chunks/entries/endpoints/api/admin/verify/_server.js-BykObuV2.js` (because `src/routes/api/admin/verify/+server.js` imports `ADMIN_PASSWORD` from `$env/static/private`, which inlines the value at build time, and `build/` is intentionally committed). The repo `github.com/mcsporkt654/overcast-gaming` is public. **Rotate the password immediately and purge it from git history.** (Details: §4.1)
2. **🔴 The production database is empty — every data page on the live site is broken.** The Render Postgres instance (`overcast-db`, `dpg-d9apsfu7r5hc7398fu00-a`) contains **zero tables**. `scripts/migrate-to-pg.js` was never run against it. `/api/players`, `/api/stats`, `/api/matches`, etc. all return 500 (`relation "players" does not exist`), so Roster, Stats, The OWL standings, Matchups, Meta, and the homepage stat tiles all show error/empty states in production. (Details: §4.2)
3. **🟠 Three parallel stacks live in one repo and two of them are dead.** Legacy Express (`server.js` + `public/`) can't even run (Express isn't in `package.json` dependencies), and the three SvelteKit pages (`src/routes/+page.svelte`, `roster`, `stats`) are silently shadowed by same-named files in `static/` and are never served. What users actually see is 13 hand-written static HTML pages in `static/`. This is the main source of confusion, drift, and wasted effort. (Details: §3)
4. **🟠 Do NOT rebuild from the ground up — consolidate instead.** The visual design (`static/style.css`), the Postgres schema (`schema.sql`), and the SvelteKit API endpoints (`src/routes/api/*`) are all worth keeping. The right move is a **strategic consolidation onto SvelteKit**: port the 13 static HTML pages into Svelte routes/components, then delete the two dead stacks. This is a frontend-layer rebuild inside the existing project, not a greenfield rewrite. (Full reasoning: §2)

---

## 1. What the app is

A Warhammer 40K league site for Portland, OR ("Overcast Wargaming League"): public pages for the roster, match stats/analytics, league standings ("The OWL"), community posts, a gallery, plus a password-protected admin panel for entering players/matches/events.

**Deployment (verified live):**

| Piece | Value |
|---|---|
| Web service | Render **free tier**, `srv-d9aq9pm7r5hc7399amkg`, https://overcast-gaming.onrender.com, Oregon, auto-deploys from `main` |
| Build/start | Build: `npm install` (no build step!) · Start: `npm start` → `node -r dotenv/config build/index.js` (runs the **committed** `build/` folder) |
| Database | Render Postgres 18 `overcast-db` (`dpg-d9apsfu7r5hc7398fu00-a`), plan `basic_256mb`, Oregon — **currently empty** |
| Repo | `github.com/mcsporkt654/overcast-gaming` — **public** |

---

## 2. The rebuild question — my recommendation

**Recommendation: consolidate onto the SvelteKit stack; do not start over.**

Reasons a ground-up rewrite is NOT justified:

- The **design system is done and good.** `static/style.css` (~1,400 lines) plus the page layouts already deliver a distinctive, cohesive brand. A rewrite throws away the most finished part of the product.
- The **data model is done and good.** `schema.sql` is a sensible, indexed Postgres schema with referential integrity. The problem is it was never applied to production, not that it's wrong.
- The **API layer is done and mostly good.** The SvelteKit endpoints under `src/routes/api/` are clean, parameterized SQL with input validation ported from the old Express code.
- The scale is tiny (a local league). Nothing about the requirements demands a different framework, runtime, or database.

What DOES need to be rebuilt (and this is real work, so budget for it): **the entire page layer.** The 13 static HTML files in `static/` each embed their own copy of the nav, footer, and page scripts, fetch data client-side with no SSR, and have already drifted from their abandoned twins in `public/` (e.g., `public/news-data.js` and `static/news-data.js` contain completely different article sets). Porting these into SvelteKit routes with shared components eliminates the duplication, enables server-side rendering (faster first paint, real SEO/social metadata), and makes the three currently-dead Svelte pages the live ones.

**Verdict: keep the repo, keep the stack, keep the design, keep the schema and API. Rebuild the page layer as Svelte components and delete the two dead stacks.** Phased plan in §7.

---

## 3. Architecture findings (the three-stacks problem)

### 3.1 Inventory of the three stacks

| Stack | Entry point | Serves | Status |
|---|---|---|---|
| A. Legacy Express + JSON files | `server.js` (848 lines) | `public/*.html`, `/api/*` from `data/*.json` | **Dead.** `express` is not in `package.json` dependencies, so `node server.js` crashes. `public/` has drifted behind `static/`. README still documents this stack as the way to run the app. |
| B. SvelteKit SSR pages | `src/routes/{+page,roster,stats}` + `+layout.svelte`, `Header.svelte` | `/`, `/roster`, `/stats` (in theory) | **Dead.** adapter-node serves `static/` assets before SSR routes, and `static/index.html`, `static/roster.html`, `static/stats.html` shadow all three routes. Verified empirically: responses for `/`, `/roster`, `/stats` contain zero SvelteKit markers. The server `load` functions and the API-unavailable banner in `+layout.svelte` never run. |
| C. Static HTML + SvelteKit API | `static/*.html` (13 pages, ~5,600 lines total) + `src/routes/api/*` (Postgres) | Everything users actually see | **Live.** Pages fetch from `/api/*` client-side. |

### 3.2 Consequences observed

- **Drift is already happening:** `public/news-data.js` (11 articles, placeholder content) vs `static/news-data.js` (5 articles, the league's real posts). Anyone "fixing" a page in `public/` is editing a ghost.
- **Duplicated chrome:** every one of the 13 static pages carries its own `<nav>` markup, footer, Google Fonts tags, and inline `<style>`/`<script>` blocks. A nav change means 13 edits (×2 if you touch `public/` too).
- **README is wrong:** `README.md` Quick Start says `node server.js` — which crashes. It describes the app as an Express + flat-file wireframe; production is SvelteKit + Postgres.
- **`build/` is committed to git** (~3.2 MB incl. `.br`/`.gz` artifacts) because Render's build command is just `npm install`. This creates the stale-build footgun (edit `src/`, forget `npm run build`, push → prod serves old code) and is the direct cause of the password leak in §4.1.

---

## 4. Critical defects (fix before anything else)

### 4.1 🔴 Admin password leaked in public repo

- `src/routes/api/admin/verify/+server.js:3` — `import { ADMIN_PASSWORD } from '$env/static/private'`. SvelteKit **statically inlines** `$env/static/private` values into build output.
- `build/` is committed (see note in `.gitignore` explaining Render serves it directly).
- Result: the plaintext password sits in `build/server/chunks/entries/endpoints/api/admin/verify/_server.js-BykObuV2.js` in a **public** GitHub repo, and it is the working password for the **live** admin panel.

**Fix (in order):**
1. Choose a new strong password. Update the `ADMIN_PASSWORD` env var on the Render service (dashboard → service → Environment) and in local `.env`.
2. Change the import to runtime lookup: `import { env } from '$env/dynamic/private'` and read `env.ADMIN_PASSWORD` inside the handler (mirrors how `src/lib/auth.js` already reads `process.env.JWT_SECRET` — which is NOT leaked, verified).
3. Stop committing `build/` (see §6.2), rebuild, redeploy.
4. Purge the old secret from git history (`git filter-repo` or BFG on the `build/` paths), force-push, and treat the old password as burned regardless.
5. While in the Render dashboard: also rotate `JWT_SECRET` (cheap insurance; it invalidates at most one 8-hour admin session).

**Acceptance:** `grep -r "<old password>" .` and a search of the GitHub repo return nothing; live admin login works with the new password only.

### 4.2 🔴 Production database is empty

- `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` against `dpg-d9apsfu7r5hc7398fu00-a` returns `[]`.
- Production logs show `relation "players" does not exist` (Postgres error 42P01) on every API hit.
- Local dev has the same symptom for a different reason: `.env` contains `ADMIN_PASSWORD`, `JWT_SECRET`, `PORT` but **no `DATABASE_URL`**, so every local API call throws `DatabaseUnavailableError`.

**Fix:**
1. Get the **external** connection string from the Render dashboard for `overcast-db`.
2. Run `DATABASE_URL="<external-url>" npm run migrate` locally. The script (`scripts/migrate-to-pg.js`) applies `schema.sql` and seeds from `data/*.json` in one transaction, idempotently (`ON CONFLICT DO NOTHING`).
3. Add `DATABASE_URL` (the same external URL, or a local Postgres for dev) to local `.env` so local dev works.
4. Prefer the **internal** connection string in the Render service's env var (same-region private network — faster and no TLS-to-the-internet hop).

**Acceptance:** `curl https://overcast-gaming.onrender.com/api/stats` returns 200 with real numbers; Roster/Stats/OWL/Matchups/Meta pages render data in production.

### 4.3 🟠 The graceful-degradation path (503) never fires

`src/hooks.server.js:32-40` wraps `resolve(event)` in try/catch expecting to convert `DatabaseUnavailableError` into a 503 with `Retry-After`. But SvelteKit catches endpoint/load errors internally and routes them to `handleError` (returning a generic 500) — the hook's catch never sees them. Verified: all DB-down responses are `500 {"message":"An unexpected error occurred."}`. Meanwhile the frontends (`static/*.html`, `src/routes/+layout.svelte`) specifically check `res.status === 503` to show the friendly "service unavailable" banner — which therefore never appears.

**Fix:** handle the error where it's thrown. Either (a) wrap each endpoint body in a helper (`withDb(handler)`) that catches `DatabaseUnavailableError` and returns a real 503 `Response`, or (b) have `src/lib/db.js` return a discriminated result. Delete the dead try/catch in hooks. Keep `handleError` for logging.

**Acceptance:** with `DATABASE_URL` unset locally, `/api/stats` returns HTTP 503 with the JSON error body, and the page banners appear.

### 4.4 🟠 Committed `build/` + no build on deploy

Render build command is `npm install`; the served code is whatever `build/` was last committed. Besides the secret-inlining above, this **will** eventually ship stale code.

**Fix:** change Render build command to `npm install && npm run build`, delete `build/` from the repo, add `build/` to `.gitignore` (remove the "intentionally committed" note). `package-lock.json` stays. Verify `npm run build` works in CI/Render (it does locally per the existing artifacts).

**Acceptance:** repo contains no `build/`; a push to `main` triggers Render to build and deploy fresh output.

---

## 5. Performance review

### 5.1 The dominant cost: Render free-tier cold starts

Observed live: ~25–30 s of Render's "Application loading" interstitial before first byte after idle spin-down. For a league site visited in bursts (after game night), **most visits will hit a cold start**. No amount of frontend optimization matters next to this.

Options (pick one):
- **Recommended: upgrade the web service to Starter (~$7/mo).** Zero code changes, kills the problem. Combined with the existing `basic_256mb` Postgres, total ~$13/mo.
- **Alternative (free): prerender the public pages.** After the SvelteKit consolidation (§7 Phase 2), most pages can be `export const prerender = true` + ISR-style revalidation or a rebuild-on-admin-save hook; only `/api/*` and `/admin` need the live server. The static pages could even move to a free static host/CDN. More work, but genuinely free and the fastest possible site.

### 5.2 Frontend

- **No SSR for data** — every page paints chrome, then fetches `/api/*` client-side (visible loading states, layout pop-in). Porting to SvelteKit `load` functions (Phase 2) fixes first-paint content and removes the request waterfall (`static/index.html` fires `/api/stats` + `/api/matches` after HTML+JS parse).
- **Google Fonts loaded per page** without `<link rel="preconnect">` on all pages — add preconnect, or better, self-host the two families (Inter + Oswald or similar) as woff2 and drop the third-party dependency (also simplifies CSP).
- **Images:** `static/images/community/forest-grove-gt.jpg` is **500 KB** — re-encode to WebP like its siblings (they're 8–160 KB; a prior commit already did this for others). Add `loading="lazy"` + explicit `width`/`height` to article/gallery images (hero images on `feed.html`, `news.html`, `index.html` spotlight).
- **Caching:** no `Cache-Control` on `static/` assets (style.css, nav.js, images) beyond defaults, and none on API responses. Add long-lived caching for images (they're content-addressed by name in practice) and `Cache-Control: public, max-age=60` (or similar short TTL) for read-only API GETs — this also softens cold-start pain for repeat visitors.

### 5.3 Backend / database

- `src/routes/api/stats/+server.js` runs 4 queries with only the first two parallelized — run all four via one `Promise.all` (micro, but free).
- `GET /api/matches` returns **every match with full `battle_notes`, `player_units`, `opponent_units` JSON** for list views that display a fraction of it. Add `?limit=` support and a slim column list for list contexts; the homepage only needs 10 rows.
- `src/lib/db.js:84` — `ssl: { rejectUnauthorized: false }` disables certificate verification (MITM-able). Using the **internal** Render URL removes public TLS entirely; if staying external, pin Render's CA instead.
- Pool has no `max`/`idleTimeoutMillis` tuning — fine at this scale on `basic_256mb` (default max 10 ≤ Render's connection limit), just don't scale instances without revisiting.
- No `/healthz` endpoint and Render `healthCheckPath` is unset — add a cheap `SELECT 1` health endpoint and configure it so Render restarts a wedged instance.

---

## 6. UX review

### 6.1 What's already good (preserve these)

- Strong, consistent visual identity; the dark "grimdark" theme with cyan accents is distinctive and readable.
- Mobile nav works well (hamburger + overlay + Escape/resize handling in `nav.js`, with correct `aria-expanded`/`aria-controls`).
- Pages have real empty/error states ("Loading standings from the front...", "Could not load roster data.") — they're just being exercised constantly right now because the DB is empty.
- The feed's card/timeline toggle and the homepage rotating spotlight with crossfade + image preloading are nice touches.

### 6.2 Problems, ordered by user impact

1. **Every data page is an error state in production** (§4.2). Nothing else in this section matters until that's fixed.
2. **Cold start = 25–30 s blank Render interstitial** (§5.1). To a league member this reads as "site is down."
3. **Article pages aren't shareable/SEO-visible.** `/news?slug=...` is one static HTML shell; every article shares the same `<title>` and there are no per-article OpenGraph/Twitter tags, so Discord/social embeds (the primary distribution channel for a league!) show generic previews. Fix in Phase 2: real routes (`/news/[slug]`) with SSR `<svelte:head>` metadata per article; 301 the old query-param URLs.
4. ✅ **Resolved — see Status section.** *Was:* Gallery is placeholder boxes (`static/gallery.html` renders labeled placeholder cells, no real images). Either populate it from real content or remove it from the nav until ready — a permanently-"coming soon" page erodes trust in the whole site. *Now:* removed entirely rather than populated (an Instagram auto-sync was considered and declined — see Status section).
5. **Unknown routes fall through to SvelteKit's unstyled default error page** — add a branded `+error.svelte` (404/500) once pages are ported.
6. **Admin panel friction:** the token lives in a JS variable (`static/admin.html:309`), so a page refresh silently logs you out mid-data-entry. The backend already sets an HttpOnly cookie (`src/routes/api/admin/verify/+server.js:54`) — switch admin fetches to cookie auth (`credentials: 'same-origin'`, drop the `x-admin-token` header) and the problem disappears. Longer term (Phase 3): admin match entry is one long form; for game-night bulk entry add "save & add another" that preserves date/event fields.
7. **No favicon fallback:** `/favicon.ico` 404s in logs (only `favicon.svg` exists); some tools/browsers still request `.ico`. Add one or a redirect.
8. **Data-entry integrity:** `armyUsed`/`opponentArmy` are free-text strings server-side; the analytics group by exact string, so one typo ("Tsons" vs "Thousand Sons") forks a faction's stats. Validate against the `armies` table server-side (the reference list already exists).
9. **Accessibility passes to include in the port:** table `<caption>`s or `aria-label`s on stats tables; wrap wide tables (stats, matchups, OWL standings) in `overflow-x: auto` containers for mobile; verify contrast of the dimmest text tokens (`#8a9` -range grays on near-black) against WCAG AA.

---

## 7. Execution roadmap (hand this to the implementing agent)

> Work top-to-bottom. Phases 0–1 are small and urgent. Phase 2 is the big consolidation. Don't start Phase 2 until Phase 0 is verified in production.

### Phase 0 — Stop the bleeding (hours)

| # | Task | Files/Systems | Acceptance |
|---|---|---|---|
| 0.1 | Rotate `ADMIN_PASSWORD` on Render + local `.env`; rotate `JWT_SECRET` | Render dashboard env vars, `.env` | Old password rejected on live `/admin` |
| 0.2 | Switch `verify/+server.js` to `$env/dynamic/private` | `src/routes/api/admin/verify/+server.js` | No secret strings in `npm run build` output (`grep` the new build) |
| 0.3 | Run DB migration against prod | `scripts/migrate-to-pg.js`, Render external DB URL | Live `/api/stats` returns 200; all data pages render |
| 0.4 | Add `DATABASE_URL` to local `.env` (Render external URL or local PG) | `.env`, `.env.example` (document the var) | Local dev renders data |
| 0.5 | Render build cmd → `npm install && npm run build`; delete `build/` from repo; gitignore it | Render dashboard, `.gitignore`, git | Push triggers fresh build; repo has no `build/` |
| 0.6 | Purge leaked secret from git history and force-push | git (`filter-repo`/BFG on `build/`) | GitHub search finds no secret |
| 0.7 | Fix the 503 path with an endpoint-level wrapper | `src/lib/db.js` or new `src/lib/withDb.js`, all `src/routes/api/*/+server.js`, remove dead catch in `src/hooks.server.js` | With DB down, APIs return 503 + JSON; page banners show |
| 0.8 | Set Render `healthCheckPath` to a new `/api/health` (`SELECT 1`) | new `src/routes/api/health/+server.js`, Render dashboard | Render health checks green |

### Phase 1 — Repo hygiene (half a day)

| # | Task | Acceptance |
|---|---|---|
| 1.1 | Delete stack A: `server.js`, the whole `public/` directory | App still builds and serves identically (nothing referenced them) |
| 1.2 | Rewrite `README.md`: SvelteKit + Postgres architecture, real quick-start (`npm run dev` with `DATABASE_URL`), deploy notes, remove "wireframe"/Express content | A newcomer can run the app from README alone |
| 1.3 | Restrict DB `ipAllowList` (currently `0.0.0.0/0`) to your IP(s); switch the service to the internal connection string; then remove `rejectUnauthorized: false` handling in `src/lib/db.js` for the internal path | External `psql` from an unlisted IP fails; app still works |
| 1.4 | Bump `engines.node` to `>=20` (SvelteKit 2/Vite 8 floor); confirm Render runtime matches | Build passes on Render |
| 1.5 | Decide data source of truth: `data/*.json` is now seed-only — say so in README; admin writes go to Postgres only | No code path writes JSON files |

### Phase 2 — The consolidation: port static pages to SvelteKit (the big one; do it page-by-page, deploy after each)

**Approach:** for each page, create the Svelte route, move its inline CSS into the component (or promote shared patterns into `style.css`/a shared layout), convert its inline JS data-fetching into a `+page.server.js` `load` (SSR), then **delete the shadowing file from `static/`**. The moment the static twin is deleted, the Svelte route becomes live. Keep `/api/*` response shapes stable throughout (the admin page and any stragglers depend on them).

Recommended order (risk-ascending, value-descending):

1. ✅ **DONE** — **`/` (home)** — ported from `static/index.html`; static/index.html deleted.
2. ✅ **DONE** — **`/roster` and `/stats`** — ported to visual/functional parity with the old static pages; static twins deleted.
3. ✅ **DONE** — **Shared chrome** — `+layout.svelte` with `Header`/`Footer` components replacing per-page nav/footer markup; `nav.js` is still loaded dynamically for the mobile hamburger toggle (not deleted — still used by the 8 remaining static pages).
4. **`/feed` + `/news/[slug]`** — move article content out of `static/news-data.js` into the `posts` table (schema + `/api/posts` already exist; write a small seed script mapping the 5 real articles). Real per-article routes with `<svelte:head>` OG/Twitter tags; 301 redirect `/news?slug=x` → `/news/x`.
5. **`/owl`, `/matchups`, `/meta`, `/player`, `/match-detail`** — port; `/player?id=` → `/players/[id]`, `/match-detail?id=` → `/matches/[id]` (keep query-param redirects).
6. ❌ **REMOVED, not ported** — Gallery (`/gallery`) was placeholder content with low expected user interest; the user asked for it to pull real content from Instagram instead, decided against the Meta Developer setup that would require, and had it cut entirely. No `/gallery` route, static file, or nav link remain anywhere. Do not re-add without checking with the user first.
7. **`/admin`** — port last (biggest page, 668 lines). Switch to cookie auth (`credentials: 'same-origin'`, remove `x-admin-token` path from `src/lib/auth.js#extractAdminToken` once done). Add army-name validation against the `armies` table on match/player writes. Add "save & add another".
8. **Cleanup:** delete every remaining `static/*.html` + `static/news-data.js`; add branded `+error.svelte`; remove `'unsafe-inline'` for scripts from the CSP in `src/hooks.server.js` (now possible — no more inline scripts).

See "Porting pattern established" in the Status section at the top of this document for the concrete recipe used for items 1–3, including a hydration-timing gotcha that cost real debugging time and will very likely recur on items 4, 5, and 7 if not accounted for up front.

**Acceptance for the phase:** `static/` contains only true assets (css until it's componentized, images, favicon, owl-mark); every route SSRs meaningful HTML (verify with `curl | grep`); Lighthouse (mobile) ≥ 90 performance / ≥ 95 SEO on `/`, `/roster`, `/news/[slug]`; article links unfurl correctly in Discord.

### Phase 3 — Performance & polish

- Decide cold-start strategy (§5.1): Starter plan **or** prerender + revalidate. Recommended: Starter plan first (immediate), evaluate prerendering later.
- Self-host fonts; add `loading="lazy"` + dimensions to images; re-encode `forest-grove-gt.jpg` → WebP.
- `Cache-Control` headers: long-lived for images/css, short TTL for read-only API GETs.
- Slim `GET /api/matches` list payload + `?limit=`.
- Wide-table `overflow-x` wrappers; contrast audit; table captions.
- `sitemap.xml` + `robots.txt` + per-page meta descriptions.

### Phase 4 — Ops & safety net

- **Backups:** confirm Render Postgres point-in-time/daily snapshots are on for `overcast-db`; document restore steps in README.
- **Tests:** keep `scripts/api-integration-test.js` green throughout; extend with: auth required on all POSTs, 503 path, army-name validation. Add a minimal Playwright smoke (home renders stats; roster lists players; article page has OG tags) run in CI (GitHub Action) before deploy.
- **Monitoring:** Render notify-on-fail is on; add a free uptime ping (e.g., UptimeRobot) against `/api/health`.
- **Rate limiting note:** the in-memory login limiter (`verify/+server.js`) resets on every deploy/restart and is per-instance — acceptable at `numInstances: 1`; revisit if scaling.

---

## 8. Things that are fine — do not "improve" them

- **Stack choice** (SvelteKit + adapter-node + Postgres on Render): appropriate for the scale; don't switch frameworks or add an ORM.
- **`schema.sql`**: solid (FKs, indexes, denormalized `player_name`/`mission_name` for read speed is a fine trade here). Only addition worth considering later: an `armies`-FK or CHECK on `matches.army_used` once validation lands.
- **Parameterized SQL everywhere** in `src/routes/api/*` — no injection risk found; keep the pattern.
- **HTML-escaping discipline** in the static pages (`escapeHtml` used at every `innerHTML` data sink in `roster/player/meta/matchups/match-detail`) — carry the same discipline into Svelte (automatic, but don't use `{@html}` on user data).
- **Security headers** in `src/hooks.server.js` — good baseline; only planned change is tightening `script-src` after Phase 2.8.
- **`basic_256mb` Postgres plan** — plenty for this data volume.

---

## 9. Quick reference: verified facts an executor should not have to re-derive

- Express is **not installed**; `server.js` cannot run. Safe to delete with `public/`.
- `/`, `/roster`, `/stats` responses contain no SvelteKit markers — static files win over SSR routes in adapter-node's asset handling. Deleting a `static/X.html` is what activates the corresponding Svelte route.
- Production DB `dpg-d9apsfu7r5hc7398fu00-a`: `information_schema.tables` (public schema) = empty set, as of 2026-07-17.
- Production API failure mode: HTTP 500, body `{"message":"An unexpected error occurred."}`; logs show Postgres `42P01 relation "players" does not exist`.
- `JWT_SECRET` is read via `process.env` at runtime (`src/lib/auth.js`) — **not** baked into build output (verified). Only `ADMIN_PASSWORD` leaked.
- Local `.env` currently has `ADMIN_PASSWORD`, `JWT_SECRET`, `PORT` — no `DATABASE_URL`.
- `data/*.json` holds the real seed data (players, matches, posts, armies, missions, events) consumed by `scripts/migrate-to-pg.js`.
- Render service: free plan, Oregon, `numInstances: 1`, auto-deploy on commit to `main`, no health check path configured.
