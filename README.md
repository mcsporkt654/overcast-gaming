# ☠ Overcast Gaming — Warhammer 40K League Site

> Portland, Oregon's premier Warhammer 40,000 competitive gaming league.

---

## 🚀 Quick Start

```bash
npm install
node server.js
```

Server runs at **http://localhost:3459** by default.

---

## 🔐 Admin Panel

- URL: `/admin`
- **Password: `overcast40k`**

> ⚠️ Change this in `server.js` and `public/admin.html` before going public.

---

## 📄 Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, live stats bar, recent matches, merch banner |
| `/roster` | Player cards with win rates and army tags |
| `/stats` | Full match log with leaderboard and faction win rates |
| `/admin` | Password-protected admin panel to add players and record matches |

---

## 🗂️ File Structure

```
overcast-gaming/
├── server.js          # Express server + REST API
├── package.json
├── data/
│   ├── players.json   # Player roster (flat-file DB)
│   └── matches.json   # Match history (flat-file DB)
├── public/
│   ├── index.html     # Home page
│   ├── roster.html    # Roster grid
│   ├── stats.html     # Match stats + leaderboard
│   ├── admin.html     # Admin panel
│   └── style.css      # All styles (dark 40K theme)
└── README.md
```

---

## 🛠️ API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/players` | All players with computed win rates |
| POST | `/api/players` | Add a new player |
| GET | `/api/matches` | All matches (newest first) |
| POST | `/api/matches` | Record a new match |
| GET | `/api/stats` | Summary stats (leaderboard, army win rates) |

---

## ⚙️ Configuration

- **Port:** Set via `PORT` env variable, defaults to `3459`
- **Data:** JSON files in `data/` — edit directly or use the admin panel
- **Password:** Hardcoded in `public/admin.html` as `ADMIN_PASSWORD = 'overcast40k'`

---

## 🎨 Branding

- **Colors:** Dark blue-green `#1a3a3a`, Mint accent `#4ecdc4`, Deep background `#0a1a1a`
- **Fonts:** Cinzel (gothic headers), Rajdhani (body) — loaded from Google Fonts
- **Theme:** Warhammer 40K gothic aesthetic — gritty but sleek

---

## 🛒 Merch Link

> **UPDATE THIS:** Open `public/index.html` and search for `UPDATE THIS` comments.
> Replace the `href="#"` in the merch banner with the actual store URL.

---

## 📌 TODOs / Before Going Live

- [ ] Change admin password from `overcast40k`
- [ ] Add actual merch store URL (search `UPDATE THIS` in `index.html`)
- [ ] Add real player photos (update `photo` field in `data/players.json` or via admin)
- [ ] Set up a real domain / reverse proxy (nginx/Caddy)
- [ ] Consider adding authentication middleware to API routes (currently only frontend-protected)
- [ ] Back up `data/` folder regularly (no database — it's just JSON)

---

## 🏆 Sample Players Seeded

| Name | Armies |
|------|--------|
| Commander Vex | Chaos Space Marines, World Eaters |
| Lady Thornwood | Necrons, Aeldari |
| Brother Kael | Space Marines, Blood Angels |
| The Overlord | Necrons |
| Wraithborn | Aeldari, Drukhari |

10 sample matches are included covering Dec 2025 – Mar 2026.

---

*Not affiliated with Games Workshop. Warhammer 40,000 © Games Workshop Ltd.*
