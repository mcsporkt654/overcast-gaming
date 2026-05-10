/**
 * Overcast Gaming — Warhammer 40K League Site
 * Node.js + Express server with JSON flat-file database
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3459;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const ADMIN_LOGIN_WINDOW_MS = 1000 * 60 * 15;
const ADMIN_LOGIN_MAX_ATTEMPTS = 8;

const adminSessions = new Map();
const loginAttempts = new Map();

if (!ADMIN_PASSWORD) {
  console.error('❌  ADMIN_PASSWORD not set in .env — admin routes disabled for safety.');
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function pruneAuthState(now = Date.now()) {
  for (const [token, session] of adminSessions.entries()) {
    if (session.expiresAt <= now) adminSessions.delete(token);
  }

  for (const [ip, attempts] of loginAttempts.entries()) {
    if (attempts.windowEndsAt <= now) loginAttempts.delete(ip);
  }
}

function consumeLoginAttempt(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  let attempts = loginAttempts.get(key);

  if (!attempts || attempts.windowEndsAt <= now) {
    attempts = { count: 0, windowEndsAt: now + ADMIN_LOGIN_WINDOW_MS };
  }

  if (attempts.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    loginAttempts.set(key, attempts);
    return Math.ceil((attempts.windowEndsAt - now) / 1000);
  }

  attempts.count += 1;
  loginAttempts.set(key, attempts);
  return 0;
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip || 'unknown');
}

function createAdminSessionToken() {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, { expiresAt: Date.now() + ADMIN_SESSION_TTL_MS });
  return token;
}

function requireAdmin(req, res, next) {
  pruneAuthState();

  const token = req.headers['x-admin-token'];
  if (!ADMIN_PASSWORD || typeof token !== 'string' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = adminSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    adminSessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Sliding session refresh while active
  session.expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  adminSessions.set(token, session);
  req.adminToken = token;
  next();
}

const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data:; connect-src 'self'"
  );
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper: Read/Write JSON ──────────────────────────────────────────────────
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeString(value, maxLength = 120) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeHttpUrl(value) {
  const raw = normalizeString(value, 300);
  if (!raw) return '';

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

// ─── API: Players ─────────────────────────────────────────────────────────────
app.get('/api/players', (req, res) => {
  const players = readJSON(PLAYERS_FILE);
  const matches = readJSON(MATCHES_FILE);

  // Enrich players with win rate stats
  const enriched = players.map(p => {
    const playerMatches = matches.filter(m => m.playerId === p.id);
    const wins = playerMatches.filter(m => m.result === 'W').length;
    const losses = playerMatches.filter(m => m.result === 'L').length;
    const draws = playerMatches.filter(m => m.result === 'D').length;
    const total = playerMatches.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : null;
    return { ...p, wins, losses, draws, total, winRate };
  });

  res.json(enriched);
});

app.post('/api/players', requireAdmin, (req, res) => {
  const players = readJSON(PLAYERS_FILE);
  const { name, armies, photo, socials } = req.body;

  if (!name || !armies || !Array.isArray(armies)) {
    return res.status(400).json({ error: 'Name and armies array are required.' });
  }

  const cleanName = normalizeString(name, 80);
  if (!cleanName) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const cleanArmies = armies
    .map(a => normalizeString(a, 80))
    .filter(Boolean)
    .slice(0, 12);

  if (!cleanArmies.length) {
    return res.status(400).json({ error: 'At least one valid army is required.' });
  }

  const allowedSocials = ['instagram', 'twitter', 'youtube', 'twitch', 'tiktok', 'discord', 'reddit', 'facebook'];
  const cleanSocials = {};
  if (socials && typeof socials === 'object') {
    allowedSocials.forEach(s => {
      if (socials[s] && typeof socials[s] === 'string') {
        const normalized = normalizeHttpUrl(socials[s]);
        if (normalized) cleanSocials[s] = normalized;
      }
    });
  }

  const newPlayer = {
    id: 'player-' + Date.now(),
    name: cleanName,
    armies: cleanArmies,
    photo: normalizeHttpUrl(photo),
    socials: cleanSocials
  };

  players.push(newPlayer);
  writeJSON(PLAYERS_FILE, players);
  res.json({ success: true, player: newPlayer });
});

// ─── API: Matches ─────────────────────────────────────────────────────────────
app.get('/api/matches', (req, res) => {
  const matches = readJSON(MATCHES_FILE);
  // Sort newest first
  matches.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(matches);
});

app.post('/api/matches', requireAdmin, (req, res) => {
  const matches = readJSON(MATCHES_FILE);
  const players = readJSON(PLAYERS_FILE);

  const { date, playerId, armyUsed, opponentName, opponentArmy, result, pointsDiff } = req.body;

  if (!date || !playerId || !armyUsed || !opponentName || !opponentArmy || !result) {
    return res.status(400).json({ error: 'All fields except pointsDiff are required.' });
  }

  if (!isIsoDate(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
  }

  const player = players.find(p => p.id === playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found.' });
  }

  const cleanArmyUsed = normalizeString(armyUsed, 80);
  const cleanOpponentName = normalizeString(opponentName, 80);
  const cleanOpponentArmy = normalizeString(opponentArmy, 80);
  if (!cleanArmyUsed || !cleanOpponentName || !cleanOpponentArmy) {
    return res.status(400).json({ error: 'Army and opponent fields must be valid strings.' });
  }

  const normalizedResult = String(result).toUpperCase();
  if (!['W', 'L', 'D'].includes(normalizedResult)) {
    return res.status(400).json({ error: 'Result must be one of W, L, or D.' });
  }

  let normalizedPointsDiff = null;
  if (pointsDiff !== undefined && pointsDiff !== '') {
    const parsed = Number.parseInt(pointsDiff, 10);
    if (Number.isNaN(parsed)) {
      return res.status(400).json({ error: 'Points difference must be a valid integer.' });
    }
    normalizedPointsDiff = parsed;
  }

  const newMatch = {
    id: 'match-' + Date.now(),
    date,
    playerId,
    playerName: player.name,
    armyUsed: cleanArmyUsed,
    opponentName: cleanOpponentName,
    opponentArmy: cleanOpponentArmy,
    result: normalizedResult,
    pointsDiff: normalizedPointsDiff
  };

  matches.push(newMatch);
  writeJSON(MATCHES_FILE, matches);
  res.json({ success: true, match: newMatch });
});

// ─── API: Stats summary ───────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const players = readJSON(PLAYERS_FILE);
  const matches = readJSON(MATCHES_FILE);

  // Total counts
  const totalPlayers = players.length;
  const totalGames = matches.length;

  // Most played army
  const armyCounts = {};
  matches.forEach(m => {
    armyCounts[m.armyUsed] = (armyCounts[m.armyUsed] || 0) + 1;
  });
  const mostPlayedArmy = Object.entries(armyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Leaderboard (min 3 games)
  const leaderboard = players
    .map(p => {
      const playerMatches = matches.filter(m => m.playerId === p.id);
      const wins = playerMatches.filter(m => m.result === 'W').length;
      const total = playerMatches.length;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      return { name: p.name, wins, losses: playerMatches.filter(m => m.result === 'L').length, draws: playerMatches.filter(m => m.result === 'D').length, total, winRate };
    })
    .filter(p => p.total >= 3)
    .sort((a, b) => b.winRate - a.winRate);

  // Army win rates
  const armyStats = {};
  matches.forEach(m => {
    if (!armyStats[m.armyUsed]) armyStats[m.armyUsed] = { wins: 0, total: 0 };
    armyStats[m.armyUsed].total++;
    if (m.result === 'W') armyStats[m.armyUsed].wins++;
  });
  const armyWinRates = Object.entries(armyStats)
    .map(([army, s]) => ({ army, wins: s.wins, total: s.total, winRate: Math.round((s.wins / s.total) * 100) }))
    .sort((a, b) => b.winRate - a.winRate);

  res.json({ totalPlayers, totalGames, mostPlayedArmy, leaderboard, armyWinRates });
});

// ─── API: Admin verify (checks password server-side, never exposes it) ────────
app.post('/api/admin/verify', (req, res) => {
  pruneAuthState();

  const retryAfterSeconds = consumeLoginAttempt(req.ip);
  if (retryAfterSeconds > 0) {
    return res.status(429).json({
      success: false,
      error: 'Too many login attempts. Try again later.',
      retryAfterSeconds
    });
  }

  const { password } = req.body;
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Invalid credentials.' });
  }

  clearLoginAttempts(req.ip);
  const token = createAdminSessionToken();

  res.json({ success: true, token, expiresInSeconds: Math.floor(ADMIN_SESSION_TTL_MS / 1000) });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  adminSessions.delete(req.adminToken);
  res.json({ success: true });
});

// ─── API: Posts ───────────────────────────────────────────────────────────────
app.get('/api/posts', (req, res) => {
  const posts = readJSON(POSTS_FILE);
  res.json(posts);
});

// ─── HTML Routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/roster', (req, res) => res.sendFile(path.join(__dirname, 'public', 'roster.html')));
app.get('/stats', (req, res) => res.sendFile(path.join(__dirname, 'public', 'stats.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/feed', (req, res) => res.sendFile(path.join(__dirname, 'public', 'feed.html')));
app.get('/news', (req, res) => res.sendFile(path.join(__dirname, 'public', 'news.html')));
app.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gallery.html')));
app.get('/owl', (req, res) => res.sendFile(path.join(__dirname, 'public', 'owl.html')));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚙️  Overcast Gaming server running at http://localhost:${PORT}`);
  console.log(`📋  Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🗄️  Data directory: ${DATA_DIR}\n`);
});
