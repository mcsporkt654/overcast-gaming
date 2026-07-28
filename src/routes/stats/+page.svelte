<script>
  /** @type {import('./$types').PageData} */
  export let data;
</script>

<svelte:head>
  <title>Match Stats — Overcast Wargaming League</title>
  <script src="/stats-page.js" defer></script>
</svelte:head>

<!-- Page Header -->
<div style="background: var(--bg-card); border-bottom: 1px solid var(--border); padding: 2.5rem var(--gutter) 2rem;">
  <div style="max-width:1200px; margin:0 auto;">
    <p style="font-size:0.7rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.4rem;">The Annals of War</p>
    <h1 style="font-size:2rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-primary);">
      Match <span style="color:var(--accent)">Statistics</span>
    </h1>
    <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.4rem;">Complete battle records, faction performance, and league standings.</p>
  </div>
</div>

<section class="section">

  <div style="display:flex; gap:0.65rem; flex-wrap:wrap; margin-bottom:1.4rem;">
    <a href="/matchups" class="btn btn-outline" style="font-size:0.7rem;">Matchup Matrix</a>
    <a href="/meta" class="btn btn-outline" style="font-size:0.7rem;">Meta Trends</a>
  </div>

  <!-- Summary: Leaderboard + Army Win Rates -->
  <div class="summary-grid" id="summary-grid">
    <div class="summary-card" id="leaderboard-card">
      <h3>Leaderboard</h3>
      <div id="leaderboard-list"><div class="loader">Loading...</div></div>
    </div>
    <div class="summary-card" id="army-card">
      <h3>Faction Win Rates</h3>
      <div id="army-list"><div class="loader">Loading...</div></div>
    </div>
  </div>

  <!-- Filter Bar -->
  <div class="filter-bar">
    <input type="text" id="filter-player" placeholder="🔍 Filter by player name..." />
    <select id="filter-army">
      <option value="">All Factions</option>
    </select>
    <select id="filter-result">
      <option value="">All Results</option>
      <option value="W">Wins</option>
      <option value="L">Losses</option>
      <option value="D">Draws</option>
    </select>
  </div>

  <!-- Match Table -->
  <div class="section-header" style="margin-bottom:1rem">
    <h2>Battle Log</h2>
    <span class="section-line"></span>
    <span id="match-count" style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap"></span>
  </div>
  <div class="table-wrapper">
    <table id="match-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Player</th>
          <th>Army Used</th>
          <th>vs. Opponent</th>
          <th>Opp. Army</th>
          <th>Result</th>
          <th>Pts Diff</th>
        </tr>
      </thead>
      <tbody id="match-tbody">
        <tr><td colspan="7" class="loader">Loading battle records...</td></tr>
      </tbody>
    </table>
  </div>
</section>
