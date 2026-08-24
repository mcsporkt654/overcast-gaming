<script>
  import { goto } from '$app/navigation';
  import { rankLabel, record } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  $: seasons = data.seasons ?? [];
  $: selectedSeasonId = data.selectedSeasonId || '';
  $: selectedSeasonYear = data.selectedSeasonYear;
  $: standings = data.standings ?? { Premier: [], Stump: [] };
  $: projected = data.projected ?? { promoted: [], relegated: [] };

  async function updateFilters(nextSeasonId) {
    const params = new URLSearchParams();
    if (nextSeasonId) params.set('seasonId', nextSeasonId);
    await goto(`/owl?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  /** @param {number} wins @param {number} draws @param {number} games */
  function winPct(wins, draws, games) {
    if (!games) return '0.000';
    return ((wins + draws * 0.5) / games).toFixed(3);
  }
</script>

<svelte:head>
  <title>The OWL — Seasonal Divisions | Overcast Wargaming League</title>
  <meta
    name="description"
    content="Live division standings for The OWL with projected promotion and relegation if the season ended today."
  />
</svelte:head>

<section class="page-header page">
  <div class="eyebrow">The OWL · Division Table</div>
  <h1>Season Ladder</h1>
  <p class="lede">
    {#if selectedSeasonYear}
      Season {selectedSeasonYear} full standings for both divisions, with live promotion and relegation outlook.
    {:else}
      Full division standings with live promotion and relegation outlook.
    {/if}
  </p>

  <div class="owl-controls">
    <div class="field control-field">
      <label for="owl-season">Season</label>
      <select
        id="owl-season"
        class="input owl-input"
        bind:value={selectedSeasonId}
        on:change={() => updateFilters(selectedSeasonId)}
      >
        {#each seasons as season}
          <option value={String(season.id)}>{season.seasonYear}</option>
        {/each}
      </select>
    </div>
  </div>
</section>

<section class="section page">
  <div class="section-head">
    <div>
      <div class="eyebrow">League Outlook</div>
      <h2>Promotion & Relegation Watch</h2>
    </div>
  </div>

  <div class="projection-band">
    <div class="projection-card promotion">
      <h3>Promotion (Top 3 Stump)</h3>
      <p>
        {#if projected.promoted.length}
          {projected.promoted.join(' · ')}
        {:else}
          No promotion projection yet.
        {/if}
      </p>
    </div>
    <div class="projection-card relegation">
      <h3>Relegation (Bottom 3 Premier)</h3>
      <p>
        {#if projected.relegated.length}
          {projected.relegated.join(' · ')}
        {:else}
          No relegation projection yet.
        {/if}
      </p>
    </div>
  </div>

  <div class="division-grid">
    <article class="division-card" id="premier-standings">
      <header class="division-head">
        <h3>Premier Division</h3>
        <p>Top flight standings</p>
      </header>
      <div class="table-scroll">
        <table class="table">
          <caption class="visually-hidden">Premier division standings</caption>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Army</th>
              <th>W</th>
              <th>L</th>
              <th>D</th>
              <th>GP</th>
              <th>Win%</th>
              <th>Avg VP</th>
              <th style="text-align:right">Total VP</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each standings.Premier as row (row.id)}
              <tr class:row-promotion={row.status === 'promotion'} class:row-relegation={row.status === 'relegation'}>
                <td class="tnum">{rankLabel(row.rank)}</td>
                <td><a href="/players/{row.id}">{row.name}</a></td>
                <td class="tmut">{row.army || '—'}</td>
                <td class="tnum">{row.wins}</td>
                <td class="tnum">{row.losses}</td>
                <td class="tnum">{row.draws}</td>
                <td class="tnum">{row.games}</td>
                <td class="tnum">{winPct(row.wins, row.draws, row.games)}</td>
                <td class="tnum">{row.avgVp ?? '—'}</td>
                <td class="tnum">{row.totalVp}</td>
                <td>
                  {#if row.status === 'relegation'}
                    <span class="tag relegation-tag">Relegation</span>
                  {:else}
                    <span class="tag tag-neutral">Safe</span>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="11" class="empty-row">No Premier league matches recorded for this season yet.</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mobile-standings" aria-label="Premier mobile standings cards">
        {#each standings.Premier as row (row.id)}
          <article class="standing-tile" class:tile-relegation={row.status === 'relegation'}>
            <header class="tile-head">
              <div class="tile-rank-name">
                <span class="tile-rank">#{rankLabel(row.rank)}</span>
                <a href="/players/{row.id}" class="tile-player">{row.name}</a>
              </div>
              {#if row.status === 'relegation'}
                <span class="tag relegation-tag">Relegation</span>
              {:else}
                <span class="tag tag-neutral">Safe</span>
              {/if}
            </header>

            <p class="tile-army">{row.army || 'Army: —'}</p>

            <div class="tile-stats">
              <span><b>W</b> {row.wins}</span>
              <span><b>L</b> {row.losses}</span>
              <span><b>D</b> {row.draws}</span>
              <span><b>GP</b> {row.games}</span>
              <span><b>Win%</b> {winPct(row.wins, row.draws, row.games)}</span>
              <span><b>Avg VP</b> {row.avgVp ?? '—'}</span>
              <span><b>Total VP</b> {row.totalVp}</span>
            </div>
          </article>
        {:else}
          <p class="empty-row">No Premier league matches recorded for this season yet.</p>
        {/each}
      </div>
    </article>

    <article class="division-card" id="stump-standings">
      <header class="division-head">
        <h3>Stump Division</h3>
        <p>Promotion race standings</p>
      </header>
      <div class="table-scroll">
        <table class="table">
          <caption class="visually-hidden">Stump division standings</caption>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Army</th>
              <th>W</th>
              <th>L</th>
              <th>D</th>
              <th>GP</th>
              <th>Win%</th>
              <th>Avg VP</th>
              <th style="text-align:right">Total VP</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each standings.Stump as row (row.id)}
              <tr class:row-promotion={row.status === 'promotion'} class:row-relegation={row.status === 'relegation'}>
                <td class="tnum">{rankLabel(row.rank)}</td>
                <td><a href="/players/{row.id}">{row.name}</a></td>
                <td class="tmut">{row.army || '—'}</td>
                <td class="tnum">{row.wins}</td>
                <td class="tnum">{row.losses}</td>
                <td class="tnum">{row.draws}</td>
                <td class="tnum">{row.games}</td>
                <td class="tnum">{winPct(row.wins, row.draws, row.games)}</td>
                <td class="tnum">{row.avgVp ?? '—'}</td>
                <td class="tnum">{row.totalVp}</td>
                <td>
                  {#if row.status === 'promotion'}
                    <span class="tag promo-tag">Promotion</span>
                  {:else}
                    <span class="tag tag-neutral">Safe</span>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="11" class="empty-row">No Stump league matches recorded for this season yet.</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mobile-standings" aria-label="Stump mobile standings cards">
        {#each standings.Stump as row (row.id)}
          <article class="standing-tile" class:tile-promotion={row.status === 'promotion'}>
            <header class="tile-head">
              <div class="tile-rank-name">
                <span class="tile-rank">#{rankLabel(row.rank)}</span>
                <a href="/players/{row.id}" class="tile-player">{row.name}</a>
              </div>
              {#if row.status === 'promotion'}
                <span class="tag promo-tag">Promotion</span>
              {:else}
                <span class="tag tag-neutral">Safe</span>
              {/if}
            </header>

            <p class="tile-army">{row.army || 'Army: —'}</p>

            <div class="tile-stats">
              <span><b>W</b> {row.wins}</span>
              <span><b>L</b> {row.losses}</span>
              <span><b>D</b> {row.draws}</span>
              <span><b>GP</b> {row.games}</span>
              <span><b>Win%</b> {winPct(row.wins, row.draws, row.games)}</span>
              <span><b>Avg VP</b> {row.avgVp ?? '—'}</span>
              <span><b>Total VP</b> {row.totalVp}</span>
            </div>
          </article>
        {:else}
          <p class="empty-row">No Stump league matches recorded for this season yet.</p>
        {/each}
      </div>
    </article>
  </div>
</section>

<style>
  .owl-controls {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: minmax(160px, 220px);
    gap: var(--space-4);
    padding: var(--space-3);
    border: 1px solid var(--color-divider);
    background: color-mix(in srgb, var(--color-surface) 86%, #000 14%);
    max-width: 280px;
  }

  .owl-input {
    min-height: 40px;
    border-width: 2px;
    font-family: var(--font-heading);
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .projection-band {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .division-grid {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  .division-card {
    border: 1px solid var(--color-divider);
    background: color-mix(in srgb, var(--color-surface) 88%, #000 12%);
    padding: var(--space-3);
  }

  .mobile-standings {
    display: none;
    margin-top: 0.5rem;
    gap: 0.7rem;
  }

  .standing-tile {
    border: 1px solid var(--color-divider);
    background: color-mix(in srgb, var(--color-surface) 80%, #000 20%);
    padding: 0.7rem;
  }

  .tile-promotion {
    border-color: color-mix(in srgb, var(--color-accent) 55%, var(--color-divider));
    background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
  }

  .tile-relegation {
    border-color: color-mix(in srgb, var(--loss) 45%, var(--color-divider));
    background: color-mix(in srgb, var(--loss) 8%, var(--color-surface));
  }

  .tile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tile-rank-name {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .tile-rank {
    font-family: var(--font-heading);
    font-size: 0.82rem;
    color: color-mix(in srgb, var(--color-text) 75%, transparent);
  }

  .tile-player {
    font-weight: 700;
    text-decoration: none;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tile-player:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .tile-army {
    margin: 0.35rem 0 0.55rem;
    color: color-mix(in srgb, var(--color-text) 68%, transparent);
    font-size: 0.84rem;
  }

  .tile-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
    font-size: 0.84rem;
  }

  .tile-stats span {
    border: 1px solid color-mix(in srgb, var(--color-divider) 78%, transparent);
    padding: 0.3rem 0.4rem;
    background: color-mix(in srgb, var(--color-surface) 75%, #000 25%);
  }

  .division-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 0.8rem;
  }

  .division-head h3 {
    margin: 0;
  }

  .division-head p {
    margin: 0;
    font-size: 0.85rem;
    color: color-mix(in srgb, var(--color-text) 68%, transparent);
  }

  .projection-card {
    border: 1px solid var(--color-divider);
    padding: var(--space-3);
    background: var(--color-surface);
  }

  .projection-card h3 {
    margin: 0 0 var(--space-2);
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .projection-card p {
    margin: 0;
    font-size: 14px;
  }

  .projection-card.promotion h3 { color: var(--color-accent); }
  .projection-card.relegation h3 { color: var(--loss); }

  .promo-tag {
    background: color-mix(in srgb, var(--color-accent) 25%, transparent);
    color: var(--color-accent-300);
  }

  .relegation-tag {
    background: color-mix(in srgb, var(--loss) 22%, transparent);
    color: #ffb1b1;
  }

  .row-promotion {
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }

  .row-relegation {
    background: color-mix(in srgb, var(--loss) 10%, transparent);
  }

  @media (max-width: 860px) {
    .owl-controls {
      grid-template-columns: 1fr;
      max-width: none;
    }

    .projection-band {
      grid-template-columns: 1fr;
    }

    .table-scroll {
      display: none;
    }

    .mobile-standings {
      display: grid;
    }

    .tile-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
