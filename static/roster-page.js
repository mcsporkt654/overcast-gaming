let activePlayerAnalytics = null;
let activePlayerArmy = '';
let activePlayerSubfaction = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toDate(value) {
  if (!value) return 'Unknown date';
  return new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeSocialUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function createPlaceholderAvatar() {
  const placeholder = document.createElement('div');
  placeholder.className = 'player-avatar-placeholder';
  placeholder.textContent = '☠';
  return placeholder;
}

function createSocialButton(def, url) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.title = def.label;
  link.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid var(--border);color:' + def.color + ';text-decoration:none;transition:background .15s,transform .15s;';
  link.innerHTML = def.svg;
  link.addEventListener('mouseenter', () => {
    link.style.background = 'rgba(255,255,255,0.12)';
    link.style.transform = 'translateY(-2px)';
  });
  link.addEventListener('mouseleave', () => {
    link.style.background = 'rgba(255,255,255,0.06)';
    link.style.transform = '';
  });
  return link;
}

function playerListSources() {
  return window.location.protocol === 'file:'
    ? ['../data/players.json', '/api/players']
    : ['/api/players', '../data/players.json'];
}

function playerAnalyticsSources(playerId) {
  return window.location.protocol === 'file:'
    ? [null, '../data/players.json', '../data/matches.json']
    : [`/api/players/${encodeURIComponent(playerId)}/analytics`, '/api/players', '../data/players.json', '../data/matches.json'];
}

async function fetchJsonFallback(urls) {
  const list = Array.isArray(urls) ? urls : [urls];
  let lastError = null;

  for (const url of list) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${url}`);
      return await res.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load JSON data.');
}

async function loadPlayerAnalytics(playerId) {
  const useLocalFiles = window.location.protocol === 'file:';

  if (!useLocalFiles) {
    try {
      const res = await fetch(`/api/players/${encodeURIComponent(playerId)}/analytics`);
      if (res.ok) return await res.json();
    } catch (_) {
      // Fall through to local-data computation.
    }
  }

  const [players, matches] = await Promise.all([
    fetchJsonFallback(playerListSources()),
    fetchJsonFallback(window.location.protocol === 'file:' ? ['../data/matches.json', '/api/matches'] : ['/api/matches', '../data/matches.json'])
  ]);

  const player = players.find(p => p.id === playerId) || { id: playerId, name: 'Unknown Commander' };
  const playerMatches = matches
    .filter(match => match.playerId === playerId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const factionMap = new Map();
  const subfactionMap = new Map();
  const monthlyMap = new Map();

  playerMatches.forEach(match => {
    const army = match.armyUsed || 'Unknown';
    const subfaction = match.armySubfaction || 'Unspecified';
    const result = ['W', 'L', 'D'].includes(match.result) ? match.result : 'D';

    if (!factionMap.has(army)) factionMap.set(army, { army, wins: 0, losses: 0, draws: 0, total: 0, firstDate: match.date, lastDate: match.date });
    const factionRow = factionMap.get(army);
    factionRow.total += 1;
    factionRow.firstDate = factionRow.firstDate < match.date ? factionRow.firstDate : match.date;
    factionRow.lastDate = factionRow.lastDate > match.date ? factionRow.lastDate : match.date;
    if (result === 'W') factionRow.wins += 1;
    else if (result === 'L') factionRow.losses += 1;
    else factionRow.draws += 1;

    const subKey = `${army}__${subfaction}`;
    if (!subfactionMap.has(subKey)) subfactionMap.set(subKey, { army, subfaction, wins: 0, losses: 0, draws: 0, total: 0, firstDate: match.date, lastDate: match.date });
    const subRow = subfactionMap.get(subKey);
    subRow.total += 1;
    subRow.firstDate = subRow.firstDate < match.date ? subRow.firstDate : match.date;
    subRow.lastDate = subRow.lastDate > match.date ? subRow.lastDate : match.date;
    if (result === 'W') subRow.wins += 1;
    else if (result === 'L') subRow.losses += 1;
    else subRow.draws += 1;

    if (/^\d{4}-\d{2}-\d{2}$/.test(match.date || '')) {
      const month = match.date.slice(0, 7);
      if (!monthlyMap.has(month)) monthlyMap.set(month, { month, wins: 0, losses: 0, draws: 0, total: 0 });
      const monthRow = monthlyMap.get(month);
      monthRow.total += 1;
      if (result === 'W') monthRow.wins += 1;
      else if (result === 'L') monthRow.losses += 1;
      else monthRow.draws += 1;
    }
  });

  return {
    player,
    matches: playerMatches,
    factionStats: Array.from(factionMap.values()).map(row => ({ ...row, winRate: row.total ? Math.round((row.wins / row.total) * 100) : 0 })).sort((a, b) => b.total - a.total || b.winRate - a.winRate),
    subfactionStats: Array.from(subfactionMap.values()).map(row => ({ ...row, winRate: row.total ? Math.round((row.wins / row.total) * 100) : 0 })).sort((a, b) => b.total - a.total || b.winRate - a.winRate),
    monthlyStats: Array.from(monthlyMap.values()).map(row => ({ ...row, winRate: row.total ? Math.round((row.wins / row.total) * 100) : 0 })).sort((a, b) => a.month.localeCompare(b.month))
  };
}

function openPlayerModal() {
  const modal = document.getElementById('player-modal');
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePlayerModal() {
  const modal = document.getElementById('player-modal');
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderPlayerModal(data) {
  const modalBody = document.getElementById('player-modal-body');
  const player = data.player || {};
  const matches = Array.isArray(data.matches) ? data.matches : [];
  const factions = Array.isArray(data.factionStats) ? data.factionStats : [];
  const subfactions = Array.isArray(data.subfactionStats) ? data.subfactionStats : [];
  const monthly = Array.isArray(data.monthlyStats) ? data.monthlyStats : [];

  const visibleMatches = matches.filter(match => {
    if (activePlayerArmy && match.armyUsed !== activePlayerArmy) return false;
    if (activePlayerSubfaction && (match.armySubfaction || 'Unspecified') !== activePlayerSubfaction) return false;
    return true;
  });

  const overallWins = visibleMatches.filter(m => m.result === 'W').length;
  const overallLosses = visibleMatches.filter(m => m.result === 'L').length;
  const overallDraws = visibleMatches.filter(m => m.result === 'D').length;
  const overallTotal = visibleMatches.length;
  const overallWinRate = overallTotal ? Math.round((overallWins / overallTotal) * 100) : 0;

  const availableSubfactions = subfactions.filter(s => !activePlayerArmy || s.army === activePlayerArmy);
  if (activePlayerSubfaction && !availableSubfactions.some(s => s.subfaction === activePlayerSubfaction)) {
    activePlayerSubfaction = '';
  }

  const armyOptions = ['<option value="">All Factions</option>']
    .concat(factions.map(f => `<option value="${escapeHtml(f.army)}" ${activePlayerArmy === f.army ? 'selected' : ''}>${escapeHtml(f.army)}</option>`))
    .join('');
  const subfactionOptions = ['<option value="">All Subfactions</option>']
    .concat(availableSubfactions.map(s => `<option value="${escapeHtml(s.subfaction)}" ${activePlayerSubfaction === s.subfaction ? 'selected' : ''}>${escapeHtml(s.subfaction)}</option>`))
    .join('');

  const factionRows = factions.length ? factions.map(f => `
    <div class="leaderboard-row">
      <span class="lb-name">${escapeHtml(f.army)}</span>
      <span class="lb-record">${f.wins}-${f.losses}-${f.draws}</span>
      <span class="lb-winrate">${f.winRate}%</span>
    </div>
  `).join('') : '<p class="no-data">No faction data yet.</p>';

  const subfactionRows = availableSubfactions.length ? availableSubfactions.map(s => `
    <div class="leaderboard-row">
      <span class="lb-name">${escapeHtml(s.subfaction)}</span>
      <span class="lb-record">${s.wins}-${s.losses}-${s.draws}</span>
      <span class="lb-winrate">${s.winRate}%</span>
    </div>
  `).join('') : '<p class="no-data">Pick a faction to see subfactions.</p>';

  const monthlyRows = monthly.length ? monthly.map(m => `
    <tr>
      <td style="white-space:nowrap; color:var(--text-muted);">${escapeHtml(toDate(`${m.month}-01`))}</td>
      <td>${m.wins}-${m.losses}-${m.draws}</td>
      <td>${m.winRate}%</td>
      <td>${m.total}</td>
    </tr>
  `).join('') : '<tr><td colspan="4" class="no-data">No monthly trend data.</td></tr>';

  const matchRows = visibleMatches.length ? visibleMatches.map(match => `
    <tr class="player-match-row" data-match-id="${escapeHtml(match.id)}" style="cursor:pointer;">
      <td style="white-space:nowrap; color:var(--text-muted);">${escapeHtml(toDate(match.date))}</td>
      <td>${escapeHtml(match.armyUsed || '—')}</td>
      <td>${escapeHtml(match.armySubfaction || 'Unspecified')}</td>
      <td>${escapeHtml(match.opponentName || '—')}</td>
      <td><span class="result-badge result-${escapeHtml(match.result || 'D')}">${escapeHtml(match.result || 'D')}</span></td>
      <td>${match.pointsDiff == null ? '—' : escapeHtml(String(match.pointsDiff))}</td>
      <td>${escapeHtml(match.missionName || '—')}</td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="no-data">No matches match the selected filters.</td></tr>';

  modalBody.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <h3 id="player-modal-title">${escapeHtml(player.name || 'Unknown Commander')}</h3>
        <p style="color:var(--text-secondary); margin-bottom:0.25rem;">Record: <span style="color:var(--text-primary)">${overallWins}-${overallLosses}-${overallDraws}</span></p>
        <p style="color:var(--text-secondary); margin-bottom:0.25rem;">Win Rate: <span style="color:var(--text-primary)">${overallWinRate}%</span></p>
        <p style="color:var(--text-secondary);">Games: <span style="color:var(--text-primary)">${overallTotal}</span></p>
      </div>
      <div class="summary-card">
        <h3>Filter History</h3>
        <div class="filter-bar" style="margin-bottom:0;">
          <select id="player-modal-army-filter">${armyOptions}</select>
          <select id="player-modal-subfaction-filter">${subfactionOptions}</select>
        </div>
        <p class="form-hint" style="margin-top:0.6rem;">Narrow the match list by faction or subfaction.</p>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Faction Split</h3>
        ${factionRows}
      </div>
      <div class="summary-card">
        <h3>Subfaction Split</h3>
        ${subfactionRows}
      </div>
    </div>

    <div class="summary-card" style="margin-bottom:1.25rem;">
      <h3>Win Rate Over Time</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Record</th>
              <th>Win %</th>
              <th>Games</th>
            </tr>
          </thead>
          <tbody>${monthlyRows}</tbody>
        </table>
      </div>
    </div>

    <div class="summary-card">
      <h3>Match List</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Army</th>
              <th>Subfaction</th>
              <th>Opponent</th>
              <th>Result</th>
              <th>Pts Diff</th>
              <th>Mission</th>
            </tr>
          </thead>
          <tbody>${matchRows}</tbody>
        </table>
      </div>
    </div>

    <div style="display:flex; gap:0.65rem; flex-wrap:wrap; justify-content:flex-end; margin-top:1rem;">
      <a class="btn btn-outline" href="/player?id=${encodeURIComponent(player.id || '')}" style="font-size:0.72rem;">Open Full Player Page</a>
    </div>
  `;

  document.getElementById('player-modal-army-filter').value = activePlayerArmy;
  document.getElementById('player-modal-subfaction-filter').value = activePlayerSubfaction;

  document.getElementById('player-modal-army-filter').addEventListener('change', e => {
    activePlayerArmy = e.target.value;
    activePlayerSubfaction = '';
    renderPlayerModal(data);
  });

  document.getElementById('player-modal-subfaction-filter').addEventListener('change', e => {
    activePlayerSubfaction = e.target.value;
    renderPlayerModal(data);
  });

  document.querySelectorAll('.player-match-row').forEach(row => {
    row.addEventListener('click', () => {
      window.location.href = `/match-detail?id=${encodeURIComponent(row.dataset.matchId)}`;
    });
  });
}

document.querySelectorAll('[data-close-player-modal]').forEach(el => {
  el.addEventListener('click', closePlayerModal);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.getElementById('player-modal').hidden) {
    closePlayerModal();
  }
});

fetchJsonFallback(playerListSources())
  .then(async players => {
    if (players.length && players.every(p => typeof p.total === 'number')) {
      return players;
    }

    const matches = await fetchJsonFallback(window.location.protocol === 'file:' ? ['../data/matches.json', '/api/matches'] : ['/api/matches', '../data/matches.json']);
    const byPlayer = new Map();
    matches.forEach(match => {
      if (!match.playerId) return;
      if (!byPlayer.has(match.playerId)) byPlayer.set(match.playerId, { wins: 0, losses: 0, draws: 0, total: 0 });
      const row = byPlayer.get(match.playerId);
      row.total += 1;
      if (match.result === 'W') row.wins += 1;
      else if (match.result === 'L') row.losses += 1;
      else row.draws += 1;
    });

    return players.map(player => {
      const stats = byPlayer.get(player.id) || { wins: 0, losses: 0, draws: 0, total: 0 };
      return {
        ...player,
        ...stats,
        winRate: stats.total ? Math.round((stats.wins / stats.total) * 100) : null
      };
    });
  })
  .then(players => {
    const grid = document.getElementById('roster-grid');
    grid.textContent = '';

    if (!players.length) {
      const empty = document.createElement('p');
      empty.className = 'no-data';
      empty.textContent = 'No players found. Add one via the Admin panel.';
      grid.appendChild(empty);
      return;
    }

    players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.style.cursor = 'pointer';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `View games for ${p.name || 'Unknown Commander'}`);

      const openPlayer = () => {
        const modalBody = document.getElementById('player-modal-body');
        modalBody.innerHTML = '<div class="loader">Loading player analytics...</div>';
        activePlayerAnalytics = null;
        activePlayerArmy = '';
        activePlayerSubfaction = '';
        openPlayerModal();

          loadPlayerAnalytics(p.id)
            .then(data => {
              activePlayerAnalytics = data;
              renderPlayerModal(data);
            })
            .catch(() => {
              modalBody.innerHTML = '<p class="no-data">Could not load player analytics.</p>';
            });
      };

      card.addEventListener('click', event => {
        if (event.target.closest('a')) return;
        openPlayer();
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPlayer();
        }
      });

      if (p.photo) {
        const img = document.createElement('img');
        img.src = p.photo;
        img.alt = p.name || 'Player avatar';
        img.style.cssText = 'width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border-glow);margin:0 auto 1rem;display:block;';
        img.addEventListener('error', () => {
          img.replaceWith(createPlaceholderAvatar());
        });
        card.appendChild(img);
      } else {
        card.appendChild(createPlaceholderAvatar());
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'player-name';
      nameEl.textContent = p.name || 'Unknown Commander';
      card.appendChild(nameEl);

      const armiesWrap = document.createElement('div');
      armiesWrap.className = 'army-tags';
      const armies = Array.isArray(p.armies) ? p.armies : [];
      if (armies.length) {
        armies.forEach(army => {
          const tag = document.createElement('span');
          tag.className = 'army-tag';
          tag.textContent = army;
          armiesWrap.appendChild(tag);
        });
      } else {
        const unaligned = document.createElement('span');
        unaligned.className = 'army-tag';
        unaligned.style.color = 'var(--text-muted)';
        unaligned.textContent = 'Unaligned';
        armiesWrap.appendChild(unaligned);
      }
      card.appendChild(armiesWrap);

      const statsWrap = document.createElement('div');
      statsWrap.style.cssText = 'margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--border)';
      if ((p.total || 0) > 0) {
        const winRate = document.createElement('span');
        winRate.className = 'player-win-rate';
        winRate.textContent = `${p.winRate}%`;

        const label = document.createElement('span');
        label.className = 'player-win-label';
        label.textContent = 'Win Rate';

        const wld = document.createElement('p');
        wld.className = 'player-wld';

        const wins = document.createElement('span');
        wins.className = 'w';
        wins.textContent = `W ${p.wins}`;
        const losses = document.createElement('span');
        losses.className = 'l';
        losses.textContent = `L ${p.losses}`;
        const draws = document.createElement('span');
        draws.className = 'd';
        draws.textContent = `D ${p.draws}`;

        wld.appendChild(wins);
        wld.appendChild(document.createTextNode(' • '));
        wld.appendChild(losses);
        wld.appendChild(document.createTextNode(' • '));
        wld.appendChild(draws);
        wld.appendChild(document.createTextNode(` (${p.total} games)`));

        statsWrap.appendChild(winRate);
        statsWrap.appendChild(label);
        statsWrap.appendChild(wld);
      } else {
        const noGames = document.createElement('span');
        noGames.style.cssText = 'font-size:0.75rem; color:var(--text-muted)';
        noGames.textContent = 'No games recorded';
        statsWrap.appendChild(noGames);
      }
      card.appendChild(statsWrap);

      const hint = document.createElement('p');
      hint.style.cssText = 'margin-top:0.6rem;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);text-align:center;';
      hint.textContent = 'Click card to view games';
      card.appendChild(hint);

      // Social buttons
      const socialDefs = {
        instagram: { label: 'Instagram', color: '#E1306C', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
        twitter:   { label: 'X / Twitter', color: '#1DA1F2', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
        youtube:   { label: 'YouTube', color: '#FF0000', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>' },
        twitch:    { label: 'Twitch', color: '#9146FF', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>' },
        tiktok:    { label: 'TikTok', color: '#ff0050', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z"/></svg>' },
        discord:   { label: 'Discord', color: '#5865F2', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>' },
        reddit:    { label: 'Reddit', color: '#FF4500', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>' },
        facebook:  { label: 'Facebook', color: '#1877F2', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' }
      };

      const socials = p.socials || {};
      const socialWrap = document.createElement('div');
      socialWrap.style.cssText = 'margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);display:flex;gap:6px;justify-content:center;flex-wrap:wrap;';

      let socialCount = 0;
      Object.entries(socialDefs).forEach(([key, def]) => {
        if (!socials[key]) return;
        const url = normalizeSocialUrl(socials[key]);
        if (!url) return;
        socialWrap.appendChild(createSocialButton(def, url));
        socialCount += 1;
      });

      if (socialCount > 0) {
        card.appendChild(socialWrap);
      }

      const historyBtn = document.createElement('a');
      historyBtn.href = `/player?id=${encodeURIComponent(p.id)}`;
      historyBtn.className = 'btn btn-outline';
      historyBtn.style.cssText = 'margin-top:0.9rem; font-size:0.68rem; width:100%; justify-content:center;';
      historyBtn.textContent = 'Open Full Profile';
      historyBtn.addEventListener('click', event => event.stopPropagation());
      card.appendChild(historyBtn);

      grid.appendChild(card);
    });
  })
  .catch(() => {
    const grid = document.getElementById('roster-grid');
    grid.textContent = '';
    const error = document.createElement('p');
    error.className = 'no-data';
    error.textContent = 'Could not load roster data.';
    grid.appendChild(error);
  });
