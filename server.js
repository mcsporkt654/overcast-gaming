/**
 * Overcast Gaming — Warhammer 40K League Site
 * Node.js + Express server with JSON flat-file database
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3459;

const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
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

app.post('/api/players', (req, res) => {
  const players = readJSON(PLAYERS_FILE);
  const { name, armies, photo } = req.body;

  if (!name || !armies || !Array.isArray(armies)) {
    return res.status(400).json({ error: 'Name and armies array are required.' });
  }

  const newPlayer = {
    id: 'player-' + Date.now(),
    name: name.trim(),
    armies: armies.map(a => a.trim()).filter(Boolean),
    photo: photo ? photo.trim() : ''
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

app.post('/api/matches', (req, res) => {
  const matches = readJSON(MATCHES_FILE);
  const players = readJSON(PLAYERS_FILE);

  const { date, playerId, armyUsed, opponentName, opponentArmy, result, pointsDiff } = req.body;

  if (!date || !playerId || !armyUsed || !opponentName || !opponentArmy || !result) {
    return res.status(400).json({ error: 'All fields except pointsDiff are required.' });
  }

  const player = players.find(p => p.id === playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found.' });
  }

  const newMatch = {
    id: 'match-' + Date.now(),
    date,
    playerId,
    playerName: player.name,
    armyUsed: armyUsed.trim(),
    opponentName: opponentName.trim(),
    opponentArmy: opponentArmy.trim(),
    result: result.toUpperCase(),
    pointsDiff: pointsDiff !== undefined && pointsDiff !== '' ? parseInt(pointsDiff, 10) : null
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

// ─── HTML Routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/roster', (req, res) => res.sendFile(path.join(__dirname, 'public', 'roster.html')));
app.get('/stats', (req, res) => res.sendFile(path.join(__dirname, 'public', 'stats.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚙️  Overcast Gaming server running at http://localhost:${PORT}`);
  console.log(`📋  Admin panel: http://localhost:${PORT}/admin (password: overcast40k)`);
  console.log(`🗄️  Data directory: ${DATA_DIR}\n`);
});
