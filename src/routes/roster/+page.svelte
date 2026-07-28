<script>
  /** @type {import('./$types').PageData} */
  export let data;
</script>

<svelte:head>
  <title>Roster — Overcast Wargaming League</title>
  <script src="/roster-page.js" defer></script>
</svelte:head>

<!-- Page Header -->
<div style="background: var(--bg-card); border-bottom: 1px solid var(--border); padding: 2.5rem var(--gutter) 2rem;">
  <div style="max-width:1200px; margin:0 auto;">
    <p style="font-size:0.7rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.4rem;">Portland, Oregon</p>
    <h1 style="font-size:2rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-primary);">
      The <span style="color:var(--accent)">Roster</span>
    </h1>
    <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.4rem;">The commanders of Overcast Wargaming League and the factions they command.</p>
  </div>
</div>

<!-- Roster Grid -->
<section class="section">
  <div id="roster-grid" class="roster-grid">
    <div class="loader">Summoning warriors...</div>
  </div>
</section>

<div id="player-modal" class="player-modal" hidden aria-hidden="true">
  <div class="player-modal-backdrop" data-close-player-modal></div>
  <div class="player-modal-panel" role="dialog" aria-modal="true" aria-labelledby="player-modal-title">
    <button class="player-modal-close" type="button" data-close-player-modal aria-label="Close player details">×</button>
    <div id="player-modal-body">
      <div class="loader">Selecting commander...</div>
    </div>
  </div>
</div>
