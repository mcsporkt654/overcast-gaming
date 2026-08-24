<script>
  import { goto } from '$app/navigation';
  import { matchVp, formatDiff } from '$lib/vp.js';
  import { shortDate, record, rankLabel } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  let playerFilter = '';
  let armyFilter = '';
  let resultFilter = '';
  let selectedSeasonId = '';
  let selectedDivision = '';
  let includeExhibition = false;

  $: stats = data.stats;
  $: standings = stats?.standings ?? [];
  $: factionStats = stats?.armyWinRates ?? [];
  $: matches = data.matches ?? [];
  $: seasons = data.seasons ?? [];
  $: divisions = data.divisions ?? [];
  $: armies = [...new Set(matches.map((m) => m.armyUsed))].sort();

  $: seasonScopedDivisions = selectedSeasonId
    ? divisions
    : Array.from(new Map(divisions.map((d) => [d.name, d])).values());

  $: if (data?.filters) {
    selectedSeasonId = data.filters.seasonId || '';
    if (selectedSeasonId) {
      selectedDivision = data.filters.divisionId || '';
    } else {
      selectedDivision = data.filters.division || '';
    }
    includeExhibition = !!data.filters.includeExhibition;
  }

  function onSeasonChange() {
    selectedDivision = '';
    applyServerFilters();
  }

  async function applyServerFilters() {
    const params = new URLSearchParams();
    if (selectedSeasonId) params.set('seasonId', selectedSeasonId);
    if (selectedDivision) {
      if (selectedSeasonId) {
        params.set('divisionId', selectedDivision);
      } else {
        params.set('division', selectedDivision);
      }
    }
    if (includeExhibition) params.set('includeExhibition', '1');

    const query = params.toString();
    await goto(query ? `/stats?${query}` : '/stats', {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  $: filteredMatches = matches.filter((m) => {
    const needle = playerFilter.trim().toLowerCase();
    if (
      needle &&
      !m.playerName.toLowerCase().includes(needle) &&
      !m.opponentName.toLowerCase().includes(needle)
    ) {
      return false;
    }
    if (armyFilter && m.armyUsed !== armyFilter) return false;
    if (resultFilter && m.result !== resultFilter) return false;
    return true;
  });
</script>

<svelte:head>
  <title>Standings &amp; Match Log — Overcast Wargaming League</title>
  <meta
    name="description"
    content="Full Season 3 standings, the complete battle log, and a faction-by-faction breakdown for the Overcast Wargaming League."
  />
</svelte:head>

<section class="page-header page">
  <div class="eyebrow">The OWL · Seasonal Standings</div>
  <h1>Standings &amp; Match Log</h1>
  <p class="lede">
    Seasonal standings, the complete battle log, and a faction-by-faction breakdown of who's
    winning the war right now.
  </p>

  <div class="filter-row server-filters" style="margin-top:1rem;">
    <div class="field">
      <label for="filter-season">Season</label>
      <select class="input filter-input" id="filter-season" bind:value={selectedSeasonId} on:change={onSeasonChange}>
        <option value="">All seasons</option>
        {#each seasons as season}
          <option value={String(season.id)}>{season.seasonYear}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="filter-division">Division</label>
      <select class="input filter-input" id="filter-division" bind:value={selectedDivision} on:change={applyServerFilters}>
        <option value="">All divisions</option>
        {#each seasonScopedDivisions as division}
          <option value={selectedSeasonId ? String(division.id) : division.name}>{division.name}</option>
        {/each}
      </select>
    </div>
    <div class="field toggle-field">
      <label for="filter-exhibition">Include exhibition</label>
      <label class="switch" for="filter-exhibition">
        <input
          id="filter-exhibition"
          type="checkbox"
          bind:checked={includeExhibition}
          on:change={applyServerFilters}
        />
        <span class="slider" aria-hidden="true"></span>
        <span class="switch-label">Show exhibition matches</span>
      </label>
    </div>
  </div>
</section>

<!-- Standings -->
<section class="section page">
  <span class="anchor-jump" id="standings"></span>
  <div class="section-head">
    <div>
      <div class="eyebrow">Live Rankings</div>
      <h2>Full Standings</h2>
    </div>
  </div>

  <div class="table-scroll">
    <table class="table">
      <caption class="visually-hidden">League standings ranked by total victory points</caption>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Army</th>
          <th>W–L</th>
          <th>GP</th>
          <th>Avg VP</th>
          <th style="text-align:right">Total VP</th>
        </tr>
      </thead>
      <tbody>
        {#each standings as row (row.id)}
          <tr>
            <td class="tnum" style={row.rank === 1 ? 'color:var(--spark)' : ''}>
              {rankLabel(row.rank)}
            </td>
            <td><a href="/players/{row.id}">{row.name}</a></td>
            <td class="tmut">{row.army || '—'}</td>
            <td>{record(row.wins, row.losses, row.draws)}</td>
            <td class="tnum">{row.games}</td>
            <td class="tnum" class:pos={row.avgVp !== null}>{row.avgVp ?? '—'}</td>
            <td class="tnum">{row.totalVp}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="empty-row">
              No standings yet — the first logged battle starts the season.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<!-- Match log -->
<section class="section page">
  <span class="anchor-jump" id="matches"></span>
  <div class="section-head">
    <div>
      <div class="eyebrow">Battlefield Log</div>
      <h2>Match History</h2>
    </div>
    <span class="match-count">
      {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'}
    </span>
  </div>

  {#if matches.length}
    <div class="filter-row">
      <div class="field">
        <label for="filter-player">Filter by player</label>
        <input
          class="input"
          id="filter-player"
          type="text"
          placeholder="Player or opponent name"
          bind:value={playerFilter}
        />
      </div>
      <div class="field">
        <label for="filter-army">Faction</label>
        <select class="input" id="filter-army" bind:value={armyFilter}>
          <option value="">All factions</option>
          {#each armies as army}
            <option value={army}>{army}</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <label for="filter-result">Result</label>
        <select class="input" id="filter-result" bind:value={resultFilter}>
          <option value="">All results</option>
          <option value="W">Wins</option>
          <option value="L">Losses</option>
          <option value="D">Draws</option>
        </select>
      </div>
    </div>
  {/if}

  <div class="table-scroll">
    <table class="table">
      <caption class="visually-hidden">Complete match history</caption>
      <thead>
        <tr>
          <th>Date</th>
          <th>Season</th>
          <th>Division</th>
          <th>Type</th>
          <th>Player</th>
          <th>Army</th>
          <th>Opponent</th>
          <th>Opp. Army</th>
          <th>Result</th>
          <th style="text-align:right">Pts Diff</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredMatches as match (match.id)}
          {@const vp = matchVp(match)}
          <tr>
            <td><a href="/matches/{match.id}">{shortDate(match.date)}</a></td>
            <td class="tmut">{match.seasonYear ?? '—'}</td>
            <td class="tmut">{match.divisionName || '—'}</td>
            <td class="tmut">{match.matchType === 'exhibition' ? 'Exhibition' : 'League'}</td>
            <td><a href="/players/{match.playerId}">{match.playerName}</a></td>
            <td class="tmut">{match.armyUsed}</td>
            <td>{match.opponentName}</td>
            <td class="tmut">{match.opponentArmy}</td>
            <td>
              {#if match.result === 'W'}
                <span class="tag tag-accent">WIN</span>
              {:else if match.result === 'L'}
                <span class="tag tag-outline">LOSS</span>
              {:else}
                <span class="tag tag-neutral">DRAW</span>
              {/if}
            </td>
            <td class="tnum" class:pos={vp.diff > 0} class:neg={vp.diff !== null && vp.diff <= 0}>
              {formatDiff(vp.diff)}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="10" class="empty-row">
              {matches.length ? 'No matches found for the selected filters.' : 'No battles recorded yet.'}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<!-- Faction breakdown -->
<section class="section page">
  <div class="section-head">
    <div>
      <div class="eyebrow">Order of Battle</div>
      <h2>Faction Breakdown</h2>
    </div>
    <div class="deep-links">
      <a class="btn btn-ghost" href="/matchups">Matchup matrix →</a>
      <a class="btn btn-ghost" href="/meta">Meta trends →</a>
    </div>
  </div>

  {#if factionStats.length}
    <div class="faction-grid">
      {#each factionStats as faction (faction.army)}
        <div class="faction-row">
          <b>{faction.army}</b>
          <span>{faction.total} {faction.total === 1 ? 'battle' : 'battles'} · {faction.winRate}%</span>
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty-row">No faction data yet.</p>
  {/if}
</section>

<style>
  .server-filters {
    padding: var(--space-3);
    border: 1px solid var(--color-divider);
    background: color-mix(in srgb, var(--color-surface) 86%, #000 14%);
  }

  .match-count {
    font-size: 13px;
    color: color-mix(in srgb, var(--color-text) 55%, transparent);
    white-space: nowrap;
  }

  .filter-input {
    min-height: 40px;
    border-width: 2px;
    font-family: var(--font-heading);
    font-weight: 600;
    letter-spacing: 0.02em;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 90%, #000 10%), var(--color-surface));
  }

  .filter-row .field {
    flex: 1 1 200px;
  }

  .toggle-field {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .switch {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 0 2px;
    cursor: pointer;
  }

  .switch input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    width: 40px;
    height: 22px;
    border: 2px solid var(--color-divider);
    background: var(--color-surface);
    position: relative;
    transition: border-color 0.2s ease;
  }

  .slider::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    top: 2px;
    left: 2px;
    background: color-mix(in srgb, var(--color-text) 75%, transparent);
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .switch input:checked + .slider {
    border-color: var(--color-accent);
  }

  .switch input:checked + .slider::after {
    transform: translateX(18px);
    background: var(--color-accent);
  }

  .switch-label {
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-text) 78%, transparent);
  }

  .deep-links {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
</style>
