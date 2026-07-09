# Going Full-Stack on Render

**A step-by-step integration guide for the Overcast Gaming site**

*Node/Express API + static frontend + admin panel + managed PostgreSQL*

Prepared June 30, 2026 — all steps verified against current Render documentation.

---

## Two things to understand first

Most guides skip these and they cause problems. Read them before opening the Render dashboard.

### 1. Right now your data may not be safe

Render's free web services use an **ephemeral filesystem**. Any change to the filesystem is lost every time the service redeploys, restarts, or spins down — Render explicitly lists "local SQLite databases" as data you will lose. If your match data lives in a file on the service, every update could wipe it. Moving to a managed Postgres database fixes this: the database lives separately, so redeploys never touch your data.

> Source: Render, "Free Web Services" — <https://render.com/docs/free>

### 2. The free database expires in 30 days

Render's Free Postgres is great for testing, but it **expires 30 days after creation**, then allows a 14-day grace period before all data is deleted. For a site your friend relies on, plan to use a paid tier (the cheapest is $6/month).

> Source: Render, "Free Postgres" — <https://render.com/docs/free>

---

## The architecture you are building

Three pieces, all in one Render account, all in the **same region** (same-region services talk over a fast, free private network):

1. **Web Service** — your existing Node/Express app (serves the frontend, `/api/*`, and `/admin`).
2. **Render Postgres** — the new managed database holding matches, players, and admin login info.
3. **Admin** — kept as a route inside the same service, not a separate site (reasoning at the end).

---

## Step 1 — Prepare your code repo

Render deploys from a GitHub repo and redeploys automatically on every push, so your code must live there.

1. Make sure your project is in a GitHub repo (Render can deploy public or private repos).
2. Confirm your `package.json` has a working start script — Render runs `npm start` by default:

```json
"scripts": {
  "start": "node server.js"
}
```

> **Critical — the #1 first-deploy failure**
>
> Render assigns your app a port via the `PORT` environment variable (default 10000) and your server must bind to `0.0.0.0`. If Render cannot detect a bound port, the deploy fails. Read the port from the environment:

```js
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Listening on ${PORT}`));
```

3. Add the Postgres client library, then commit and push everything:

```bash
npm install pg
```

---

## Step 2 — Create the Postgres database first

Create the database before the web service so its connection string is ready when you configure the app.

1. Go to [dashboard.render.com/new/database](https://dashboard.render.com/new/database), or click **+ New → Postgres**.
2. **Name**: something like `overcast-db` (changeable later).
3. **Database** and **User**: leave blank to auto-generate. Note: unlike the name, these *cannot* be changed after creation.
4. **Region**: pick one near you (e.g., Oregon for Portland). **Write this region down — the web service must match it exactly** to get the free private network.
5. **PostgreSQL Version**: leave the default (latest).
6. **Instance type**: this is the key decision:

| Tier | Cost | Notes |
|---|---|---|
| Free | $0 | 256 MB — expires in 30 days. Test only. |
| Basic-256mb | $6/mo | Same specs, permanent, with backups. **Recommended.** |
| Basic-1gb | $19/mo | If you expect significant growth. |

   Your league data (a few players, ~50 matches) is tiny, so 256 MB lasts a long time.

7. **Storage**: start at 1 GB. You can increase later but never decrease.
8. Click **Create Database** and wait for status **Available**.

Once live, click **Connect** (top-right of the database page). You'll see two URLs:

- **Internal URL** — use this for your Render web service (faster, private, same region).
- **External URL** — use only to connect from your laptop with a tool like pgAdmin or psql.

Copy the **Internal Database URL** — you'll paste it in Step 4.

---

## Step 3 — Deploy your app as a Web Service

1. In the dashboard, click **New → Web Service**.
2. Choose **Git Provider**, connect GitHub, and select your Overcast repo.
3. Fill in the form:

| Field | Value |
|---|---|
| Name | `overcast-gaming` (becomes your `onrender.com` subdomain) |
| Region | EXACTLY the same region as your database |
| Branch | `main` (or your deploy branch) |
| Language | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |

**Instance type:**

- **Free** ($0, 512 MB) spins down after 15 minutes of inactivity and takes about a minute to wake up — visitors see a loading page on the first hit. You also get only 750 free hours/month per account.
- **Starter** ($7/mo, 512 MB, 0.5 CPU) is always-on with no cold starts. **Recommended for a public site.**

---

## Step 4 — Wire the database to the app

This environment variable is the bridge between the two services. In the form (or later under **Environment**):

1. Expand the **Advanced** section.
2. Under **Environment Variables**, click **Add Environment Variable**.
3. Key `DATABASE_URL` → Value = the **Internal Database URL** from Step 2.
4. Add your admin secret too, so it isn't hardcoded: Key `ADMIN_PASSWORD` → a strong code.
5. Click **Create Web Service**. Watch the first build on the **Events** page.

In your code, read these instead of hardcoding anything:

```js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Render requires SSL
});
```

> **Common gotcha**
>
> The `ssl` line is required — Render Postgres connections need SSL, and leaving it out causes a confusing connection error.

---

## Step 5 — Create your database tables

The database starts empty. Two ways to create tables:

### Option A — from your laptop (one-time setup)

Use the **External URL**. Render provides a ready-to-paste PSQL Command on the Connect menu. Run it, then:

```sql
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  faction TEXT
);

CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  match_date DATE,
  player_id INTEGER REFERENCES players(id),
  army TEXT,
  opponent TEXT,
  result TEXT,
  points_diff INTEGER
);

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL
);
```

### Option B — in code (better long-term)

Put a startup function that runs `CREATE TABLE IF NOT EXISTS ...`, so your schema is version-controlled. Then update `/api/stats` and `/api/matches` to query Postgres, and point the admin form's POST handler at `INSERT INTO matches ...`.

---

## Step 6 — Handle admin login properly

Since you're storing login info: **never store passwords in plain text — store a hash.**

```bash
npm install bcrypt
```

Save `bcrypt.hash(password)` when creating an admin; verify with `bcrypt.compare()` on login. That way, even if the database is exposed, the real passwords aren't.

For a single-admin league site, the `ADMIN_PASSWORD` environment-variable approach is acceptable — but switch to the hashed `admins` table the moment you have multiple admins or store user accounts.

---

## Step 7 — Test, then point your domain

1. Visit your `onrender.com` URL. Confirm stats load, admin logs in, and a submitted match **persists after a redeploy** — push a small change and verify your data survives. That's the real test the database is working.
2. For a custom domain: under the service's **Settings → Custom Domains**, add your domain and follow the DNS steps. Render provides free managed HTTPS automatically.

---

## On the separate admin portal

**Don't build a second site.** Keep `/admin` as a route inside this same web service. A second site means a second deploy, a second bill, and a second copy of your auth logic to keep in sync. The clean pattern is one app, with admin routes protected by a login check against your `admins` table or `ADMIN_PASSWORD`. You already have this working — keep it.

---

## Your realistic monthly cost

| Component | Tier | Cost |
|---|---|---|
| Web Service (always-on) | Starter | $7/mo |
| Postgres (permanent, with backups) | Basic-256mb | $6/mo |
| **TOTAL** | | **~$13/month** |

You could run it at $0 to test (Free web service + Free database), but expect cold-start delays and remember the database self-destructs at day 30. For a site your friend actually uses, $13/month is the sweet spot.

---

## Sources

All claims above are verified against current Render documentation:

- [render.com/docs/free](https://render.com/docs/free) — free web services (ephemeral filesystem), free Postgres (30-day expiration, 14-day grace period), free web service cold starts and 750 hr/month limit
- [render.com/docs/web-services](https://render.com/docs/web-services) — GitHub deploys and auto-redeploy on push, port binding requirements (`0.0.0.0` + `PORT`), Git provider connection flow
- [render.com/docs/postgresql-creating-connecting](https://render.com/docs/postgresql-creating-connecting) — database creation flow, internal vs. external connection URLs, PSQL Command from the Connect menu
- [render.com/pricing](https://render.com/pricing) — Postgres Basic-256mb ($6/mo) and Basic-1gb ($19/mo), Starter web service ($7/mo, 512 MB, 0.5 CPU, always-on)
