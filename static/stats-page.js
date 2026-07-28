let allMatches = [];

function createNoData(message, size = '0.8rem') {
  const el = document.createElement('p');
  el.className = 'no-data';
  el.style.padding = '1rem 0';
  el.style.fontSize = size;
  el.textContent = message;
  return el;
}

// Load stats summary
fetch('/api/stats')
  .then(r => r.json())
  .then(data => {
    // Leaderboard
    const lb = document.getElementById('leaderboard-list');
    lb.textContent = '';
    if (!data.leaderboard.length) {
      lb.appendChild(createNoData('No players with 3+ games yet.'));
    } else {
      const rankClasses = ['gold', 'silver', 'bronze'];
      data.leaderboard.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        row.style.cursor = 'pointer';
        row.tabIndex = 0;
        row.setAttribute('role', 'link');
        row.setAttribute('aria-label', `Open player history for ${p.name}`);
        row.addEventListener('click', () => {
          window.location.href = `/player?id=${encodeURIComponent(p.id || p.name)}`;
        });
        row.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = `/player?id=${encodeURIComponent(p.id || p.name)}`;
          }
        });

        const rank = document.createElement('span');
        rank.className = `lb-rank ${rankClasses[i] || ''}`.trim();
        rank.textContent = String(i + 1);

        const name = document.createElement('span');
        name.className = 'lb-name';
        name.textContent = p.name;
        name.style.textDecoration = 'underline dotted';

        const record = document.createElement('span');
        record.className = 'lb-record';
        record.style.fontSize = '0.72rem';

        const wins = document.createElement('span');
        wins.style.color = 'var(--win)';
        wins.textContent = `W${p.wins}`;
        const losses = document.createElement('span');
        losses.style.color = 'var(--loss)';
        losses.textContent = `L${p.losses}`;
        const draws = document.createElement('span');
        draws.style.color = 'var(--draw)';
        draws.textContent = `D${p.draws}`;
        const sep1 = document.createElement('span');
        sep1.style.color = 'var(--text-muted)';
        sep1.textContent = ' / ';
        const sep2 = document.createElement('span');
        sep2.style.color = 'var(--text-muted)';
        sep2.textContent = ' / ';

        record.appendChild(wins);
        record.appendChild(sep1);
        record.appendChild(losses);
        record.appendChild(sep2);
        record.appendChild(draws);

        const winrate = document.createElement('span');
        winrate.className = 'lb-winrate';
        winrate.textContent = `${p.winRate}%`;

        row.appendChild(rank);
        row.appendChild(name);
        row.appendChild(record);
        row.appendChild(winrate);
        lb.appendChild(row);
      });
    }

    // Army win rates
    const al = document.getElementById('army-list');
    al.textContent = '';
    if (!data.armyWinRates.length) {
      al.appendChild(createNoData('No army data yet.'));
    } else {
      data.armyWinRates.forEach(a => {
        const row = document.createElement('div');
        row.className = 'army-row';

        const armyName = document.createElement('span');
        armyName.className = 'army-name';
        armyName.textContent = a.army;

        const ratio = document.createElement('span');
        ratio.style.cssText = 'font-size:0.7rem; color:var(--text-muted)';
        ratio.textContent = `${a.wins}/${a.total}`;

        const barWrap = document.createElement('div');
        barWrap.className = 'army-bar-wrap';
        const bar = document.createElement('div');
        bar.className = 'army-bar';
        bar.style.width = `${a.winRate}%`;
        barWrap.appendChild(bar);

        const winrate = document.createElement('span');
        winrate.className = 'army-winrate';
        winrate.textContent = `${a.winRate}%`;

        row.appendChild(armyName);
        row.appendChild(ratio);
        row.appendChild(barWrap);
        row.appendChild(winrate);
        al.appendChild(row);
      });
    }
  })
  .catch(() => {});

// Load matches
fetch('/api/matches')
  .then(r => r.json())
  .then(matches => {
    allMatches = matches;

    // Populate army filter
    const armies = [...new Set(matches.map(m => m.armyUsed))].sort();
    const sel = document.getElementById('filter-army');
    armies.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a; opt.textContent = a;
      sel.appendChild(opt);
    });

    renderTable(matches);

    // Filter listeners
    document.getElementById('filter-player').addEventListener('input', applyFilters);
    document.getElementById('filter-army').addEventListener('change', applyFilters);
    document.getElementById('filter-result').addEventListener('change', applyFilters);
  })
  .catch(() => {
    const tbody = document.getElementById('match-tbody');
    tbody.textContent = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'no-data';
    cell.textContent = 'Could not load match data.';
    row.appendChild(cell);
    tbody.appendChild(row);
  });

function applyFilters() {
  const player = document.getElementById('filter-player').value.toLowerCase();
  const army = document.getElementById('filter-army').value;
  const result = document.getElementById('filter-result').value;
  const filtered = allMatches.filter(m => {
    if (player && !m.playerName.toLowerCase().includes(player) && !m.opponentName.toLowerCase().includes(player)) return false;
    if (army && m.armyUsed !== army) return false;
    if (result && m.result !== result) return false;
    return true;
  });
  renderTable(filtered);
}

function renderTable(matches) {
  const tbody = document.getElementById('match-tbody');
  document.getElementById('match-count').textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''}`;

  if (!matches.length) {
    tbody.textContent = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'no-data';
    cell.textContent = 'No matches found for the selected filters.';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  tbody.textContent = '';
  matches.forEach(m => {
    const row = document.createElement('tr');
    const safeResult = /^[WLD]$/.test(String(m.result || '').toUpperCase()) ? String(m.result).toUpperCase() : 'D';
    const date = new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

    const dateCell = document.createElement('td');
    dateCell.style.cssText = 'color:var(--text-muted); white-space:nowrap';
    dateCell.textContent = date;

    const playerCell = document.createElement('td');
    const playerLink = document.createElement('a');
    playerLink.href = `/match-detail?id=${encodeURIComponent(m.id)}`;
    playerLink.style.cssText = 'font-weight:600; color:var(--text-primary)';
    playerLink.textContent = m.playerName;
    playerCell.appendChild(playerLink);

    const armyCell = document.createElement('td');
    const armyTag = document.createElement('span');
    armyTag.className = 'army-tag';
    armyTag.textContent = m.armyUsed;
    armyCell.appendChild(armyTag);

    const oppNameCell = document.createElement('td');
    const oppLink = document.createElement('a');
    oppLink.href = `/match-detail?id=${encodeURIComponent(m.id)}`;
    oppLink.style.color = 'var(--text-secondary)';
    oppLink.textContent = m.opponentName;
    oppNameCell.appendChild(oppLink);

    const oppArmyCell = document.createElement('td');
    const oppArmyTag = document.createElement('span');
    oppArmyTag.className = 'army-tag';
    oppArmyTag.style.cssText = 'color:var(--text-muted); border-color:var(--border)';
    oppArmyTag.textContent = m.opponentArmy;
    oppArmyCell.appendChild(oppArmyTag);

    const resultCell = document.createElement('td');
    const resultBadge = document.createElement('span');
    resultBadge.className = `result-badge result-${safeResult}`;
    resultBadge.textContent = safeResult;
    resultCell.appendChild(resultBadge);

    const pointsCell = document.createElement('td');
    if (m.pointsDiff == null) {
      pointsCell.textContent = '—';
    } else if (m.pointsDiff > 0) {
      const pos = document.createElement('span');
      pos.className = 'points-pos';
      pos.textContent = `+${m.pointsDiff}`;
      pointsCell.appendChild(pos);
    } else if (m.pointsDiff < 0) {
      const neg = document.createElement('span');
      neg.className = 'points-neg';
      neg.textContent = String(m.pointsDiff);
      pointsCell.appendChild(neg);
    } else {
      pointsCell.textContent = '0';
    }

    row.appendChild(dateCell);
    row.appendChild(playerCell);
    row.appendChild(armyCell);
    row.appendChild(oppNameCell);
    row.appendChild(oppArmyCell);
    row.appendChild(resultCell);
    row.appendChild(pointsCell);
    tbody.appendChild(row);
  });
}
