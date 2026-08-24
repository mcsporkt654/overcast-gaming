<script>
  import { record } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  let selectedFaction = 'all';

  $: players = data.players ?? [];

  // One filter option per faction actually present in the roster.
  $: factions = [...new Set(players.flatMap((p) => p.armies ?? []))].sort();

  $: visiblePlayers =
    selectedFaction === 'all'
      ? players
      : players.filter((p) => (p.armies ?? []).includes(selectedFaction));

  $: sortedPlayers = [...visiblePlayers].sort((a, b) => {
    const byVp = (b.totalVp ?? 0) - (a.totalVp ?? 0);
    if (byVp !== 0) return byVp;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  $: testy = players.find((p) => (p.name ?? '').toLowerCase() === 'testy mcbest');

  $: lede =
    players.length === 0
      ? 'The roster is being built. Commanders will appear here as they join the league.'
      : `${players.length} ${players.length === 1 ? 'commander' : 'commanders'}, ` +
        `${factions.length} ${factions.length === 1 ? 'faction' : 'factions'}, one league. ` +
        'Every player logged in the OWL, ranked by current-season victory points.';
</script>

<svelte:head>
  <title>Command Roster — Overcast Wargaming League</title>
  <meta
    name="description"
    content="The commanders of the Overcast Wargaming League and the factions they command."
  />
</svelte:head>

<section class="page-header page">
  <div class="eyebrow">Order of Battle</div>
  <h1>Command Roster</h1>
  <p class="lede">{lede}</p>
</section>

<section class="section page">
  {#if factions.length > 1}
    <div class="filter-row">
      <div class="field" style="margin:0">
        <span class="field-label" id="faction-label">Filter by faction</span>
        <div class="seg" role="radiogroup" aria-labelledby="faction-label">
          <label class="seg-opt">
            <input type="radio" name="faction" value="all" bind:group={selectedFaction} />All
          </label>
          {#each factions as faction}
            <label class="seg-opt">
              <input type="radio" name="faction" value={faction} bind:group={selectedFaction} />
              {faction}
            </label>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#if testy}
    <article class="spotlight">
      {#if testy.photo}
        <img class="spotlight-photo" src={testy.photo} alt={testy.name} loading="lazy" />
      {:else}
        <div class="ph spotlight-photo"><span>Featured Commander</span></div>
      {/if}
      <div class="spotlight-body">
        <div class="spotlight-kicker">Featured Commander</div>
        <h2>{testy.name}</h2>
        <p>
          {(testy.armies ?? []).join(' · ') || 'No army logged'}
        </p>
        <div class="spotlight-stats">
          <span>{record(testy.wins, testy.losses, testy.draws)} record</span>
          <span>{testy.totalVp ?? 0} VP</span>
          <span>{Math.round(testy.winRate ?? 0)}% win rate</span>
        </div>
        <a class="btn btn-primary" href="/players/{testy.id}">View Full Profile</a>
      </div>
    </article>
  {/if}

  {#if sortedPlayers.length}
    <div class="roster-grid">
      {#each sortedPlayers as player (player.id)}
        <article class="player-card">
          {#if player.photo}
            <img class="pc-photo" src={player.photo} alt={player.name} loading="lazy" />
          {:else}
            <div class="ph"><span>Player&nbsp;Photo</span></div>
          {/if}
          <div class="pc-body">
            <div class="pc-name">{player.name}</div>
            <div class="pc-meta">
              <span>{(player.armies ?? []).join(', ') || 'No army logged'}</span>
            </div>
            <div class="pc-stats">
              <span>{record(player.wins, player.losses, player.draws)}</span>
              <span>{player.total ?? 0} battles</span>
              <span>{Math.round(player.winRate ?? 0)}% WR</span>
            </div>
            <div class="pc-meta pc-meta-bottom">
              <span class="pc-vp">{player.totalVp ?? 0}<em>VP</em></span>
              <a class="btn btn-ghost pc-profile" href="/players/{player.id}">Profile →</a>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else if players.length}
    <p class="empty-row">No commanders field {selectedFaction} yet.</p>
  {:else}
    <p class="empty-row">No commanders on the roster yet.</p>
  {/if}
</section>

<style>
  .field-label {
    display: block;
    margin-bottom: 5px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.6;
  }

  .spotlight {
    display: grid;
    grid-template-columns: 280px 1fr;
    border: 1px solid var(--color-divider);
    margin-bottom: var(--space-6);
    background: linear-gradient(
      120deg,
      color-mix(in srgb, var(--color-accent-900) 38%, transparent),
      color-mix(in srgb, var(--color-accent-2-900) 38%, transparent)
    );
  }

  .spotlight-photo {
    width: 100%;
    height: 100%;
    min-height: 220px;
    object-fit: cover;
    filter: grayscale(0.5) contrast(1.04);
  }

  .spotlight-body {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .spotlight-kicker {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--spark);
  }

  .spotlight-body h2 {
    margin: 0;
    font-size: 34px;
    text-transform: uppercase;
  }

  .spotlight-body p {
    margin: 0;
    color: color-mix(in srgb, var(--color-text) 74%, transparent);
  }

  .spotlight-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .spotlight-stats span {
    border: 1px solid var(--color-divider);
    padding: 4px 10px;
    font-size: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .pc-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pc-stats span {
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border: 1px solid var(--color-divider);
    padding: 2px 8px;
  }

  .pc-meta-bottom {
    margin-top: auto;
  }

  @media (max-width: 820px) {
    .spotlight {
      grid-template-columns: 1fr;
    }

    .spotlight-photo {
      max-height: 280px;
    }

    .spotlight-body h2 {
      font-size: 28px;
    }
  }
</style>
