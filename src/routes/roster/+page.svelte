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

  {#if visiblePlayers.length}
    <div class="roster-grid">
      {#each visiblePlayers as player (player.id)}
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
              <span>{record(player.wins, player.losses, player.draws)}</span>
            </div>
            <div class="pc-meta">
              <span class="pc-vp">{player.totalVp}<em>VP</em></span>
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
</style>
