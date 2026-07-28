// Load stats bar
fetch('/api/stats')
  .then(r => r.json())
  .then(data => {
    document.getElementById('stat-players').textContent = data.totalPlayers;
    document.getElementById('stat-games').textContent = data.totalGames;
    document.getElementById('stat-army').textContent = data.mostPlayedArmy || '—';
  })
  .catch(() => {});

// Load recent matches (last 5)
fetch('/api/matches')
  .then(r => r.json())
  .then(matches => {
    const tbody = document.getElementById('recent-tbody');
    const recent = matches.slice(0, 5);
    tbody.textContent = '';
    if (recent.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'no-data';
      cell.textContent = 'No battles recorded yet.';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    recent.forEach(m => {
      const date = new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const safeResult = /^[WLD]$/.test(String(m.result || '').toUpperCase()) ? String(m.result).toUpperCase() : 'D';

      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = date;

      const playerCell = document.createElement('td');
      playerCell.style.cssText = 'font-weight:600; color:var(--text-primary)';
      playerCell.textContent = m.playerName;

      const armyCell = document.createElement('td');
      const armyTag = document.createElement('span');
      armyTag.className = 'army-tag';
      armyTag.textContent = m.armyUsed;
      armyCell.appendChild(armyTag);

      const oppNameCell = document.createElement('td');
      oppNameCell.textContent = m.opponentName;

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
  })
  .catch(() => {
    const tbody = document.getElementById('recent-tbody');
    tbody.textContent = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'no-data';
    cell.textContent = 'Could not load match data.';
    row.appendChild(cell);
    tbody.appendChild(row);
  });

function formatNewsDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function newsHref(slug) {
  return `/news?slug=${encodeURIComponent(slug)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const spotlightItems = Array.isArray(window.OVERCAST_NEWS_ITEMS)
    ? [...window.OVERCAST_NEWS_ITEMS].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  let spotlightIndex = 0;
  let spotlightTimer = null;

  function commitSpotlightItem(item) {
    const image = document.getElementById('spotlight-image');
    const category = document.getElementById('spotlight-category');
    const date = document.getElementById('spotlight-date');
    const title = document.getElementById('spotlight-title');
    const excerpt = document.getElementById('spotlight-excerpt');
    const link = document.getElementById('spotlight-link');

    image.src = item.image;
    image.alt = `${item.title} spotlight image`;
    category.textContent = item.category || 'Dispatch';
    date.textContent = formatNewsDate(item.date);
    date.dateTime = item.date;
    title.textContent = item.title;
    excerpt.textContent = item.excerpt;
    link.href = newsHref(item.slug);
  }

  function renderSpotlight(withTransition = false) {
    if (!spotlightItems.length) return;

    const item = spotlightItems[spotlightIndex % spotlightItems.length];
    const spotlightRoot = document.getElementById('home-spotlight');

    if (!withTransition) {
      commitSpotlightItem(item);
      return;
    }

    spotlightRoot.classList.add('is-transitioning');

    const preload = new Image();
    preload.onload = () => {
      commitSpotlightItem(item);
      requestAnimationFrame(() => {
        spotlightRoot.classList.remove('is-transitioning');
      });
    };
    preload.onerror = () => {
      commitSpotlightItem(item);
      requestAnimationFrame(() => {
        spotlightRoot.classList.remove('is-transitioning');
      });
    };
    preload.src = item.image;
  }

  function rotateSpotlight(delta) {
    if (!spotlightItems.length) return;
    spotlightIndex = (spotlightIndex + delta + spotlightItems.length) % spotlightItems.length;
    renderSpotlight(true);
  }

  function startSpotlightRotation() {
    if (!spotlightItems.length) return;
    if (spotlightTimer) clearInterval(spotlightTimer);
    spotlightTimer = setInterval(() => rotateSpotlight(1), 7000);
  }

  if (spotlightItems.length) {
    renderSpotlight();
    startSpotlightRotation();

    const spotlightRoot = document.getElementById('home-spotlight');
    const prevBtn = document.getElementById('spotlight-prev');
    const nextBtn = document.getElementById('spotlight-next');

    prevBtn.addEventListener('click', () => { rotateSpotlight(-1); startSpotlightRotation(); });
    nextBtn.addEventListener('click', () => { rotateSpotlight(1); startSpotlightRotation(); });

    // Arrow-key navigation when either button is focused
    [prevBtn, nextBtn].forEach(btn => {
      btn.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          rotateSpotlight(-1);
          startSpotlightRotation();
          prevBtn.focus();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          rotateSpotlight(1);
          startSpotlightRotation();
          nextBtn.focus();
        }
      });
    });

    spotlightRoot.addEventListener('mouseenter', () => {
      if (spotlightTimer) clearInterval(spotlightTimer);
    });
    spotlightRoot.addEventListener('mouseleave', () => {
      startSpotlightRotation();
    });
  }
});
