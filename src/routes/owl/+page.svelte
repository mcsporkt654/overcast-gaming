<script>
  import { goto } from '$app/navigation';
  import { rankLabel, record } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  $: seasons = data.seasons ?? [];
  $: selectedSeasonId = data.selectedSeasonId || '';
  $: selectedSeasonYear = data.selectedSeasonYear;
  $: selectedDivision = data.selectedDivision || 'premier';
  $: standings = data.standings ?? { Premier: [], Stump: [] };
  $: projected = data.projected ?? { promoted: [], relegated: [] };

  $: activeRows = selectedDivision === 'stump' ? standings.Stump : standings.Premier;

  async function updateFilters(nextSeasonId, nextDivision) {
    const params = new URLSearchParams();
    if (nextSeasonId) params.set('seasonId', nextSeasonId);
    params.set('division', nextDivision);
    await goto(`/owl?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
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
      Season {selectedSeasonYear} standings split by division, with live promotion and relegation outlook.
    {:else}
      Division standings with live promotion and relegation outlook.
    {/if}
  </p>

  <div class="owl-controls">
    <div class="field control-field">
      <label for="owl-season">Season</label>
      <select
        id="owl-season"
        class="input owl-input"
        bind:value={selectedSeasonId}
        on:change={() => updateFilters(selectedSeasonId, selectedDivision)}
      >
        {#each seasons as season}
          <option value={String(season.id)}>{season.seasonYear}</option>
        {/each}
      </select>
    </div>

    <fieldset class="field control-field tabs-field">
      <legend>Division</legend>
      <div class="seg owl-tabs" role="tablist" aria-label="Division tabs">
        <button
          type="button"
          class="tab-btn"
          class:is-active={selectedDivision === 'premier'}
          role="tab"
          aria-selected={selectedDivision === 'premier'}
          on:click={() => updateFilters(selectedSeasonId, 'premier')}
        >
          Premier
        </button>
        <button
          type="button"
          class="tab-btn"
          class:is-active={selectedDivision === 'stump'}
          role="tab"
          aria-selected={selectedDivision === 'stump'}
          on:click={() => updateFilters(selectedSeasonId, 'stump')}
        >
          Stump
        </button>
      </div>
    </fieldset>
  </div>
</section>

<section class="section page">
  <div class="section-head">
    <div>
      <div class="eyebrow">Live Projection</div>
      <h2>
        {selectedDivision === 'premier' ? 'Premier Division' : 'Stump Division'}
      </h2>
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

  <div class="table-scroll" style="margin-top:1rem;">
    <table class="table">
      <caption class="visually-hidden">OWL division standings</caption>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Army</th>
          <th>W–L</th>
          <th>GP</th>
          <th>Avg VP</th>
          <th style="text-align:right">Total VP</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each activeRows as row (row.id)}
          <tr class:row-promotion={row.status === 'promotion'} class:row-relegation={row.status === 'relegation'}>
            <td class="tnum">{rankLabel(row.rank)}</td>
            <td><a href="/players/{row.id}">{row.name}</a></td>
            <td class="tmut">{row.army || '—'}</td>
            <td>{record(row.wins, row.losses, row.draws)}</td>
            <td class="tnum">{row.games}</td>
            <td class="tnum">{row.avgVp ?? '—'}</td>
            <td class="tnum">{row.totalVp}</td>
            <td>
              {#if row.status === 'promotion'}
                <span class="tag promo-tag">Promotion</span>
              {:else if row.status === 'relegation'}
                <span class="tag relegation-tag">Relegation</span>
              {:else}
                <span class="tag tag-neutral">Safe</span>
              {/if}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="8" class="empty-row">No division matches recorded for this season yet.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .owl-controls {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: minmax(160px, 220px) 1fr;
    gap: var(--space-4);
    padding: var(--space-3);
    border: 1px solid var(--color-divider);
    background: color-mix(in srgb, var(--color-surface) 86%, #000 14%);
  }

  .owl-input {
    min-height: 40px;
    border-width: 2px;
    font-family: var(--font-heading);
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .owl-tabs {
    display: inline-flex;
    border-width: 2px;
    min-height: 40px;
    align-items: stretch;
  }

  .tabs-field {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }

  .tabs-field legend {
    font-size: 12px;
    margin-bottom: 5px;
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
  }

  .tab-btn {
    appearance: none;
    border: 0;
    background: transparent;
    color: inherit;
    font-family: var(--font-heading);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0 16px;
    cursor: pointer;
  }

  .tab-btn + .tab-btn {
    border-left: 1px solid var(--color-divider);
  }

  .tab-btn:hover {
    background: color-mix(in srgb, var(--color-text) 7%, transparent);
  }

  .tab-btn.is-active {
    background: var(--color-accent);
    color: #0a0c0c;
  }

  .projection-band {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
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
    }

    .projection-band {
      grid-template-columns: 1fr;
    }
  }
</style>
