<script>
  /** @type {import('./$types').PageData} */
  export let data;
</script>

<svelte:head>
  <title>Overcast Wargaming League — Warhammer 40K League | Portland, OR</title>
  <meta name="description" content="Overcast Wargaming League is a Warhammer 40K competitive gaming group based in Portland, Oregon. Track roster, match stats, and league standings." />
  <script src="/news-data.js" defer></script>
  <script src="/home-page.js" defer></script>
</svelte:head>

<!-- Hero -->
<section class="hero">
  <p class="hero-eyebrow">Est. Portland, Oregon &mdash; In the Grimdark of the Far Future</p>
  <h1><span>Overcast</span> Wargaming League</h1>
  <p class="hero-tagline">For the Glory of the Battle. For the Honor of the Faction.</p>
  <p class="hero-location">⚔ Portland, Oregon &bull; Warhammer 40,000 Competitive League</p>
  <div class="hero-divider"></div>
  <div class="hero-actions">
    <a href="/roster" class="btn btn-primary">⚔ View Roster</a>
    <a href="/stats" class="btn btn-outline">📊 Match Stats</a>
    <a href="/owl" class="btn btn-outline">🏆 The OWL</a>
  </div>

  <!-- Social Links -->
  <div class="social-strip">
    <a href="https://discord.gg/zKSgE9AwEa" target="_blank" rel="noopener" class="social-chip social-chip-discord">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
      Discord
    </a>
    <a href="https://www.instagram.com/overcastwargaming/" target="_blank" rel="noopener" class="social-chip social-chip-instagram">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
      Instagram
    </a>
    <a href="https://www.youtube.com/@overcastwargaming" target="_blank" rel="noopener" class="social-chip social-chip-youtube">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
      YouTube
    </a>
  </div>
</section>

<!-- Stats Bar (dynamic) -->
<section class="stats-bar">
  <div class="stats-bar-inner" id="stats-bar">
    <div class="stat-item">
      <span class="stat-value" id="stat-players">—</span>
      <span class="stat-label">Active Players</span>
    </div>
    <div class="stat-item">
      <span class="stat-value" id="stat-games">—</span>
      <span class="stat-label">Games Played</span>
    </div>
    <div class="stat-item">
      <span class="stat-value" id="stat-army" style="font-size:1.2rem; padding-top:0.3rem;">—</span>
      <span class="stat-label">Top Army Played</span>
    </div>
  </div>
</section>

<!-- Recent Matches Preview -->
<section class="section">
  <div class="section-header">
    <h2>Recent Battles</h2>
    <span class="section-line"></span>
    <a href="/stats" class="btn btn-outline" style="font-size:0.72rem; padding: 0.4rem 1rem;">All Stats →</a>
  </div>
  <div class="table-wrapper">
    <table id="recent-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Player</th>
          <th>Army</th>
          <th>vs. Opponent</th>
          <th>Opp. Army</th>
          <th>Result</th>
          <th>Pts Diff</th>
        </tr>
      </thead>
      <tbody id="recent-tbody">
        <tr><td colspan="7" class="loader">Loading battle records...</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- Community News Feed -->
<section class="section home-news" style="padding-top:0;" id="community-news">
  <div class="section-header">
    <h2>Community News Feed</h2>
    <span class="section-line"></span>
    <a href="/feed" class="btn btn-outline" style="font-size:0.72rem; padding: 0.4rem 1rem;">All Posts →</a>
  </div>

  <div class="home-news-banner">
    <div class="home-news-banner-kicker">High Command Bulletin</div>
    <p>Dispatches from league command, battlefields, and local events in the Portland sector.</p>
  </div>

  <div class="home-spotlight" id="home-spotlight" aria-live="polite">
    <div class="home-spotlight-media-wrap">
      <img class="home-spotlight-media" id="spotlight-image" src="" alt="Featured dispatch image" />
    </div>
    <div class="home-spotlight-content">
      <div class="home-spotlight-meta">
        <span class="home-news-tag" id="spotlight-category">Dispatch</span>
        <time id="spotlight-date" datetime="2026-05-08">May 8, 2026</time>
      </div>
      <h3 id="spotlight-title">Loading featured dispatch...</h3>
      <p id="spotlight-excerpt">Stand by for the latest update from Overcast command.</p>
      <div class="home-spotlight-actions">
        <a href="/feed" class="home-news-read" id="spotlight-link">Open Dispatch →</a>
        <div class="home-spotlight-controls">
          <button type="button" class="home-spotlight-btn" id="spotlight-prev" aria-label="Previous spotlight">Previous</button>
          <button type="button" class="home-spotlight-btn" id="spotlight-next" aria-label="Next spotlight">Next</button>
        </div>
      </div>
    </div>
  </div>

  <div class="home-news-grid">
    <article class="home-news-card home-news-card-featured">
      <div class="home-news-meta">
        <span class="home-news-tag">Announcements</span>
        <time datetime="2026-02-19">Feb 19, 2026</time>
      </div>
      <h3>Owl Round 4! Final Round</h3>
      <p>Hammering Community, we are on the final round! What a season full of laughs, loves lost, fiends and friends made, and some serious dice rolling! Let's take a look at our standings going into Week 4!</p>
      <a href="/news?slug=owl-round-4-final-round" class="home-news-read">Read Full Dispatch →</a>
    </article>

    <article class="home-news-card">
      <div class="home-news-meta">
        <span class="home-news-tag">The OWL</span>
        <time datetime="2026-01-22">Jan 22, 2026</time>
      </div>
      <h3>Round 2 of the OWL!</h3>
      <p>Well folks, Round 1 was ELECTRIC, with everyone playing their asses off and leaving everything on the Board. Let's see how the rankings shape up after one round of rolling.</p>
      <a href="/news?slug=round-2-of-the-owl" class="home-news-read">View Round 2 Matchups →</a>
    </article>

    <article class="home-news-card">
      <div class="home-news-meta">
        <span class="home-news-tag">The OWL</span>
        <time datetime="2026-01-04">Jan 4, 2026</time>
      </div>
      <h3>OWL Season 3 Begins! Week 1 Matchups</h3>
      <p>Welcome back to another gravity-altering season of the OWL! This season, with its new format, promises to light up the galaxy as some real heavy hitters go blow for blow in round one.</p>
      <a href="/news?slug=owl-season-3-begins-week-1-matchups" class="home-news-read">View Week 1 Matchups →</a>
    </article>

    <article class="home-news-card">
      <div class="home-news-meta">
        <span class="home-news-tag">Announcements</span>
        <time datetime="2025-10-17">Oct 17, 2025</time>
      </div>
      <h3>Critcon 2025 Player Pack</h3>
      <p>Crit Con 25 player pack.</p>
      <a href="/news?slug=critcon-2025-player-pack" class="home-news-read">View Player Pack →</a>
    </article>
  </div>
</section>

<!-- Partners Section -->
<section class="section" style="padding-top:0;">
  <div class="section-header">
    <h2>Partners</h2>
    <span class="section-line"></span>
  </div>
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
    <div style="background:var(--bg-card); border:1px dashed var(--border); border-radius:var(--radius); padding:2rem 1.5rem; text-align:center; opacity:0.6;">
      <div style="font-size:2rem; margin-bottom:0.5rem; color:var(--text-muted);">🤝</div>
      <div style="font-family:var(--font-gothic); font-size:0.75rem; letter-spacing:0.15em; text-transform:uppercase; color:var(--text-muted);">Partner Slot</div>
    </div>
    <div style="background:var(--bg-card); border:1px dashed var(--border); border-radius:var(--radius); padding:2rem 1.5rem; text-align:center; opacity:0.6;">
      <div style="font-size:2rem; margin-bottom:0.5rem; color:var(--text-muted);">🤝</div>
      <div style="font-family:var(--font-gothic); font-size:0.75rem; letter-spacing:0.15em; text-transform:uppercase; color:var(--text-muted);">Partner Slot</div>
    </div>
    <div style="background:linear-gradient(135deg, var(--bg-card), rgba(78,205,196,0.04)); border:1px solid var(--border-glow); border-radius:var(--radius); padding:2rem 1.5rem; text-align:center;">
      <div style="font-size:1.4rem; margin-bottom:0.5rem;">✉</div>
      <div style="font-family:var(--font-gothic); font-size:0.75rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--accent); margin-bottom:0.4rem;">Become a Partner</div>
      <div style="font-size:0.78rem; color:var(--text-muted);">Reach out on <a href="https://discord.gg/zKSgE9AwEa" target="_blank" style="color:var(--accent);">Discord</a></div>
    </div>
  </div>
</section>

<!-- Merch Banner -->
<div class="merch-banner">
  <h3>⚙ Gear Up, Commander</h3>
  <p>Rep your faction. Overcast Wargaming League merch — shirts, dice bags, accessories.</p>
  <a href="https://arma.gg/collections/overcast" class="btn btn-primary" target="_blank" rel="noopener">
    🛒 Visit the Merch Store
  </a>
</div>
