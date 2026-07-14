/**
 * Overcast Gaming — Warhammer 40K League Site
 * Node.js + Express server with JSON flat-file database
 */

import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const ARMIES_FILE = path.join(DATA_DIR, 'armies.json');
const MISSIONS_FILE = path.join(DATA_DIR, 'missions.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

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

function normalizeOptionalInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeUnits(value, maxUnits = 20) {
  if (!Array.isArray(value)) return [];

  return value
    .map(unit => {
      if (typeof unit === 'string') {
        const unitName = normalizeString(unit, 80);
        return unitName ? { unitName, count: 1, role: '', points: null } : null;
      }

      if (!unit || typeof unit !== 'object') return null;

      const unitName = normalizeString(unit.unitName, 80);
      if (!unitName) return null;

      const count = normalizeOptionalInteger(unit.count);
      const points = normalizeOptionalInteger(unit.points);
      const role = normalizeString(unit.role, 40);

      return {
        unitName,
        count: count && count > 0 ? count : 1,
        role,
        points: points === null ? null : points
      };
    })
    .filter(Boolean)
    .slice(0, maxUnits);
}

function invertResult(result) {
  if (result === 'W') return 'L';
  if (result === 'L') return 'W';
  return 'D';
}

function buildSideRecords(matches) {
  const records = [];

  matches.forEach(match => {
    const armyUsed = normalizeString(match.armyUsed, 80);
    const opponentArmy = normalizeString(match.opponentArmy, 80);
    const result = ['W', 'L', 'D'].includes(match.result) ? match.result : 'D';
    const pointsDiff = Number.isInteger(match.pointsDiff) ? match.pointsDiff : null;

    if (armyUsed && opponentArmy) {
      records.push({
        army: armyUsed,
        opponentArmy,
        result,
        pointsDiff,
        date: match.date,
        matchId: match.id
      });

      records.push({
        army: opponentArmy,
        opponentArmy: armyUsed,
        result: invertResult(result),
        pointsDiff: pointsDiff === null ? null : -pointsDiff,
        date: match.date,
        matchId: match.id
      });
    }
  });

  return records;
}

function buildPlayerAnalytics(playerId) {
  const players = readJSON(PLAYERS_FILE);
  const matches = readJSON(MATCHES_FILE)
    .filter(match => match.playerId === playerId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const player = players.find(entry => entry.id === playerId);
  if (!player) return null;

  const summary = {
    wins: 0,
    losses: 0,
    draws: 0,
    total: matches.length
  };

  const factionMap = new Map();
  const subfactionMap = new Map();
  const monthlyMap = new Map();

  matches.forEach(match => {
    const result = ['W', 'L', 'D'].includes(match.result) ? match.result : 'D';
    const army = normalizeString(match.armyUsed, 80) || 'Unknown';
    const subfaction = normalizeString(match.armySubfaction, 80) || 'Unspecified';
    const month = isIsoDate(match.date) ? match.date.slice(0, 7) : 'Unknown';

    if (result === 'W') summary.wins += 1;
    if (result === 'L') summary.losses += 1;
    if (result === 'D') summary.draws += 1;

    const factionKey = army;
    if (!factionMap.has(factionKey)) {
      factionMap.set(factionKey, {
        army,
        wins: 0,
        losses: 0,
        draws: 0,
        total: 0,
        firstDate: match.date,
        lastDate: match.date
      });
    }
    const factionRow = factionMap.get(factionKey);
    factionRow.total += 1;
    factionRow.firstDate = factionRow.firstDate < match.date ? factionRow.firstDate : match.date;
    factionRow.lastDate = factionRow.lastDate > match.date ? factionRow.lastDate : match.date;
    if (result === 'W') factionRow.wins += 1;
    if (result === 'L') factionRow.losses += 1;
    if (result === 'D') factionRow.draws += 1;

    const subfactionKey = `${army}__${subfaction}`;
    if (!subfactionMap.has(subfactionKey)) {
      subfactionMap.set(subfactionKey, {
        army,
        subfaction,
        wins: 0,
        losses: 0,
        draws: 0,
        total: 0,
        firstDate: match.date,
        lastDate: match.date
      });
    }
    const subfactionRow = subfactionMap.get(subfactionKey);
    subfactionRow.total += 1;
    subfactionRow.firstDate = subfactionRow.firstDate < match.date ? subfactionRow.firstDate : match.date;
    subfactionRow.lastDate = subfactionRow.lastDate > match.date ? subfactionRow.lastDate : match.date;
    if (result === 'W') subfactionRow.wins += 1;
    if (result === 'L') subfactionRow.losses += 1;
    if (result === 'D') subfactionRow.draws += 1;

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { month, wins: 0, losses: 0, draws: 0, total: 0 });
    }
    const monthRow = monthlyMap.get(month);
    monthRow.total += 1;
    if (result === 'W') monthRow.wins += 1;
    if (result === 'L') monthRow.losses += 1;
    if (result === 'D') monthRow.draws += 1;
  });

  const factionStats = Array.from(factionMap.values())
    .map(row => ({
      ...row,
      winRate: row.total ? Math.round((row.wins / row.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total || b.winRate - a.winRate);

  const subfactionStats = Array.from(subfactionMap.values())
    .map(row => ({
      ...row,
      winRate: row.total ? Math.round((row.wins / row.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total || b.winRate - a.winRate);

  const monthlyStats = Array.from(monthlyMap.values())
    .map(row => ({
      ...row,
      winRate: row.total ? Math.round((row.wins / row.total) * 100) : 0
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const total = summary.total;
  const winRate = total ? Math.round((summary.wins / total) * 100) : 0;

  return {
    player,
    summary: { ...summary, winRate },
    factionStats,
    subfactionStats,
    monthlyStats,
    matches
  };
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

// ─── API: Reference Data ─────────────────────────────────────────────────────
app.get('/api/armies', (req, res) => {
  const armies = readJSON(ARMIES_FILE);
  res.json(Array.isArray(armies) ? armies : []);
});

app.get('/api/missions', (req, res) => {
  const missions = readJSON(MISSIONS_FILE);
  res.json(Array.isArray(missions) ? missions : []);
});

app.get('/api/events', (req, res) => {
  const events = readJSON(EVENTS_FILE);
  const sorted = (Array.isArray(events) ? events : []).sort((a, b) => {
    const left = new Date(b.startDate || b.date || 0);
    const right = new Date(a.startDate || a.date || 0);
    return left - right;
  });
  res.json(sorted);
});

app.post('/api/events', requireAdmin, (req, res) => {
  const events = readJSON(EVENTS_FILE);
  const { name, format, location, startDate, endDate, notes } = req.body;

  const cleanName = normalizeString(name, 120);
  const cleanFormat = normalizeString(format, 80);
  const cleanLocation = normalizeString(location, 120);
  const cleanNotes = normalizeString(notes, 1000);

  if (!cleanName) {
    return res.status(400).json({ error: 'Event name is required.' });
  }

  if (startDate && !isIsoDate(startDate)) {
    return res.status(400).json({ error: 'startDate must be YYYY-MM-DD.' });
  }

  if (endDate && !isIsoDate(endDate)) {
    return res.status(400).json({ error: 'endDate must be YYYY-MM-DD.' });
  }

  const newEvent = {
    id: `event-${Date.now()}`,
    name: cleanName,
    format: cleanFormat,
    location: cleanLocation,
    startDate: startDate || '',
    endDate: endDate || '',
    notes: cleanNotes
  };

  const nextEvents = Array.isArray(events) ? [...events, newEvent] : [newEvent];
  writeJSON(EVENTS_FILE, nextEvents);
  res.json({ success: true, event: newEvent });
});

// ─── API: Matches ─────────────────────────────────────────────────────────────
app.get('/api/matches', (req, res) => {
  const matches = readJSON(MATCHES_FILE);
  // Sort newest first
  matches.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(matches);
});

app.get('/api/matches/:id', (req, res) => {
  const matches = readJSON(MATCHES_FILE);
  const match = matches.find(m => m.id === req.params.id);

  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }

  res.json(match);
});

app.get('/api/players/:id/analytics', (req, res) => {
  const analytics = buildPlayerAnalytics(req.params.id);
  if (!analytics) {
    return res.status(404).json({ error: 'Player not found.' });
  }

  res.json(analytics);
});

app.post('/api/matches', requireAdmin, (req, res) => {
  const matches = readJSON(MATCHES_FILE);
  const players = readJSON(PLAYERS_FILE);
  const missions = readJSON(MISSIONS_FILE);
  const events = readJSON(EVENTS_FILE);

  const {
    date,
    playerId,
    armyUsed,
    armySubfaction,
    armyPoints,
    playerUnits,
    opponentName,
    opponentArmy,
    opponentSubfaction,
    opponentPoints,
    opponentUnits,
    missionId,
    eventId,
    primaryScorePlayer,
    primaryScoreOpponent,
    secondaryScorePlayer,
    secondaryScoreOpponent,
    destructionScorePlayer,
    destructionScoreOpponent,
    result,
    pointsDiff,
    battleNotes
  } = req.body;

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

  const cleanArmySubfaction = normalizeString(armySubfaction, 80);
  const cleanOpponentSubfaction = normalizeString(opponentSubfaction, 80);
  const normalizedArmyPoints = normalizeOptionalInteger(armyPoints);
  const normalizedOpponentPoints = normalizeOptionalInteger(opponentPoints);
  const normalizedPrimaryScorePlayer = normalizeOptionalInteger(primaryScorePlayer);
  const normalizedPrimaryScoreOpponent = normalizeOptionalInteger(primaryScoreOpponent);
  const normalizedSecondaryScorePlayer = normalizeOptionalInteger(secondaryScorePlayer);
  const normalizedSecondaryScoreOpponent = normalizeOptionalInteger(secondaryScoreOpponent);
  const normalizedDestructionScorePlayer = normalizeOptionalInteger(destructionScorePlayer);
  const normalizedDestructionScoreOpponent = normalizeOptionalInteger(destructionScoreOpponent);

  const cleanMissionId = normalizeString(missionId, 80);
  const mission = cleanMissionId
    ? (Array.isArray(missions) ? missions.find(m => m.id === cleanMissionId) : null)
    : null;
  if (cleanMissionId && !mission) {
    return res.status(400).json({ error: 'missionId does not match any known mission.' });
  }

  const cleanEventId = normalizeString(eventId, 80);
  const event = cleanEventId
    ? (Array.isArray(events) ? events.find(ev => ev.id === cleanEventId) : null)
    : null;
  if (cleanEventId && !event) {
    return res.status(400).json({ error: 'eventId does not match any known event.' });
  }

  const cleanBattleNotes = normalizeString(battleNotes, 1500);
  const normalizedPlayerUnits = normalizeUnits(playerUnits);
  const normalizedOpponentUnits = normalizeUnits(opponentUnits);

  const newMatch = {
    id: 'match-' + Date.now(),
    date,
    playerId,
    playerName: player.name,
    armyUsed: cleanArmyUsed,
    armySubfaction: cleanArmySubfaction,
    armyPoints: normalizedArmyPoints,
    playerUnits: normalizedPlayerUnits,
    opponentName: cleanOpponentName,
    opponentArmy: cleanOpponentArmy,
    opponentSubfaction: cleanOpponentSubfaction,
    opponentPoints: normalizedOpponentPoints,
    opponentUnits: normalizedOpponentUnits,
    missionId: mission ? mission.id : '',
    missionName: mission ? mission.name : '',
    eventId: event ? event.id : '',
    eventName: event ? event.name : '',
    primaryScorePlayer: normalizedPrimaryScorePlayer,
    primaryScoreOpponent: normalizedPrimaryScoreOpponent,
    secondaryScorePlayer: normalizedSecondaryScorePlayer,
    secondaryScoreOpponent: normalizedSecondaryScoreOpponent,
    destructionScorePlayer: normalizedDestructionScorePlayer,
    destructionScoreOpponent: normalizedDestructionScoreOpponent,
    result: normalizedResult,
    pointsDiff: normalizedPointsDiff,
    battleNotes: cleanBattleNotes
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
      return { id: p.id, name: p.name, wins, losses: playerMatches.filter(m => m.result === 'L').length, draws: playerMatches.filter(m => m.result === 'D').length, total, winRate };
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

app.get('/api/analytics/matchups', (req, res) => {
  const matches = readJSON(MATCHES_FILE);
  const sideRecords = buildSideRecords(matches);
  const armyFilter = normalizeString(req.query.army, 80);
  const opponentFilter = normalizeString(req.query.opponent, 80);

  const matchupMap = {};

  sideRecords.forEach(record => {
    if (armyFilter && record.army !== armyFilter) return;
    if (opponentFilter && record.opponentArmy !== opponentFilter) return;

    const key = `${record.army}__${record.opponentArmy}`;
    if (!matchupMap[key]) {
      matchupMap[key] = {
        army: record.army,
        opponentArmy: record.opponentArmy,
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        totalPointsDiff: 0
      };
    }

    const row = matchupMap[key];
    row.totalGames += 1;
    if (record.result === 'W') row.wins += 1;
    if (record.result === 'L') row.losses += 1;
    if (record.result === 'D') row.draws += 1;
    if (record.pointsDiff !== null) row.totalPointsDiff += record.pointsDiff;
  });

  const matchups = Object.values(matchupMap)
    .map(row => ({
      ...row,
      winRate: row.totalGames ? Math.round((row.wins / row.totalGames) * 100) : 0,
      avgPointsDiff: row.totalGames ? Number((row.totalPointsDiff / row.totalGames).toFixed(1)) : 0
    }))
    .sort((a, b) => {
      if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
      return b.winRate - a.winRate;
    });

  const factions = [...new Set(sideRecords.map(r => r.army))].sort();
  res.json({ factions, matchups });
});

app.get('/api/analytics/meta', (req, res) => {
  const matches = readJSON(MATCHES_FILE);
  const sideRecords = buildSideRecords(matches);

  const overallMap = {};
  const monthlyMap = {};
  let totalAppearances = 0;

  sideRecords.forEach(record => {
    if (!record.army || !record.date || !isIsoDate(record.date)) return;

    totalAppearances += 1;
    if (!overallMap[record.army]) {
      overallMap[record.army] = {
        faction: record.army,
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        totalPointsDiff: 0
      };
    }

    const overall = overallMap[record.army];
    overall.totalGames += 1;
    if (record.result === 'W') overall.wins += 1;
    if (record.result === 'L') overall.losses += 1;
    if (record.result === 'D') overall.draws += 1;
    if (record.pointsDiff !== null) overall.totalPointsDiff += record.pointsDiff;

    const monthKey = record.date.slice(0, 7);
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = {};
    if (!monthlyMap[monthKey][record.army]) {
      monthlyMap[monthKey][record.army] = {
        faction: record.army,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0
      };
    }

    const monthly = monthlyMap[monthKey][record.army];
    monthly.games += 1;
    if (record.result === 'W') monthly.wins += 1;
    if (record.result === 'L') monthly.losses += 1;
    if (record.result === 'D') monthly.draws += 1;
  });

  const overall = Object.values(overallMap)
    .map(row => ({
      ...row,
      winRate: row.totalGames ? Math.round((row.wins / row.totalGames) * 100) : 0,
      avgPointsDiff: row.totalGames ? Number((row.totalPointsDiff / row.totalGames).toFixed(1)) : 0,
      metaShare: totalAppearances ? Math.round((row.totalGames / totalAppearances) * 100) : 0
    }))
    .sort((a, b) => {
      if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
      return b.winRate - a.winRate;
    });

  const monthly = Object.keys(monthlyMap)
    .sort()
    .map(month => {
      const rows = Object.values(monthlyMap[month]);
      const totalGames = rows.reduce((sum, row) => sum + row.games, 0);
      return {
        month,
        totalGames,
        factions: rows
          .map(row => ({
            ...row,
            winRate: row.games ? Math.round((row.wins / row.games) * 100) : 0,
            metaShare: totalGames ? Math.round((row.games / totalGames) * 100) : 0
          }))
          .sort((a, b) => b.games - a.games)
      };
    });

  res.json({ totalAppearances, overall, monthly });
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
app.get('/player', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player.html')));
app.get('/stats', (req, res) => res.sendFile(path.join(__dirname, 'public', 'stats.html')));
app.get('/match-detail', (req, res) => res.sendFile(path.join(__dirname, 'public', 'match-detail.html')));
app.get('/matchups', (req, res) => res.sendFile(path.join(__dirname, 'public', 'matchups.html')));
app.get('/meta', (req, res) => res.sendFile(path.join(__dirname, 'public', 'meta.html')));
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
