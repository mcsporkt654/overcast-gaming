# Overcast Gaming Wireframe

Frontend-first Warhammer 40K league prototype for layout, interaction, and content direction.

## Wireframe Intent

This repository is intentionally a fancy wireframe, not a production system.

- All roster, match, and post content is placeholder/test data.
- Community dispatches are static demo entries in [public/news-data.js](public/news-data.js).
- Current API/data writes exist only to support demo interactions.
- The backend should be treated as replaceable scaffolding for a future real implementation.

## Quick Start

```bash
npm install
cp .env.example .env
node server.js
```

Local URL: http://localhost:3459

## Current Pages

| Route | Purpose |
| --- | --- |
| `/` | Home + recent matches + featured cards + rotating dispatch spotlight |
| `/feed` | Community listing with category filters, card/timeline view, and read-more links |
| `/news?slug=...` | Dedicated community article detail view with related dispatch suggestions |
| `/roster` | Player roster wireframe |
| `/stats` | Leaderboards and match stat views |
| `/gallery` | Community media gallery layout |
| `/owl` | Overcast Warhammer League standings layout |
| `/admin` | Admin demo controls for placeholder data editing |

## Community Content Model (Wireframe)

Community/news UX is now driven by a shared static dataset.

- Source: [public/news-data.js](public/news-data.js)
- Listing renderer: [public/feed.html](public/feed.html)
- Detail renderer: [public/news.html](public/news.html)
- Home featured cards: [public/index.html](public/index.html)

Each article entry includes:

- `slug`
- `title`
- `category`
- `date`
- `author`
- `readTime`
- `image`
- `excerpt`
- `body` (array of paragraphs)
- `highlights` (array)
- `gallery` (array)

## Recently Added UI Features

- Feed view mode toggle in [public/feed.html](public/feed.html): card mode and timeline mode.
- Related dispatch recommendations in [public/news.html](public/news.html).
- Rotating homepage dispatch spotlight in [public/index.html](public/index.html).

## Commands

```bash
npm test
```

Test coverage includes:

- Smoke validation for expected files/scripts
- API integration checks for auth, validation, and error paths

## Backend Handoff Notes (For Next Agent)

If the next agent is building a real backend, keep this UI contract stable while replacing internals.

1. Keep route compatibility for existing pages (`/`, `/feed`, `/news`, `/roster`, `/stats`, `/owl`, `/gallery`, `/admin`).
2. Replace static community source ([public/news-data.js](public/news-data.js)) with API-backed content while preserving:
	- `slug` based detail routing from `/news?slug=...`
	- category labels used by feed filters
	- image/gallery fields expected by the article template
3. Replace JSON flat-file persistence in [data/players.json](data/players.json), [data/matches.json](data/matches.json), and [data/posts.json](data/posts.json) with a database.
4. Keep admin auth behavior equivalent while migrating away from in-memory sessions.
5. Preserve response shapes currently consumed by UI scripts in:
	- [public/index.html](public/index.html)
	- [public/roster.html](public/roster.html)
	- [public/stats.html](public/stats.html)
	- [public/feed.html](public/feed.html)

## Suggested Next Frontend Features

1. Add subtle entrance transitions for timeline nodes in [public/feed.html](public/feed.html).
2. Add article breadcrumb chips (category/date) for quick navigation in [public/news.html](public/news.html).
3. Add optional manual spotlight pinning for key dispatches in [public/index.html](public/index.html).

## Notes

- Do not treat current content as real league data.
- Do not ship this as-is without backend/data replacement.
- Keep this README updated whenever routes, UI contracts, or data model assumptions change.

Not affiliated with Games Workshop. Warhammer 40,000 copyright Games Workshop Ltd.
