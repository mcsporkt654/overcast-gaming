<script>
  /** @type {import('./$types').PageData} */
  export let data;

  const { players } = data;
</script>

<svelte:head>
  <title>Roster — Overcast Gaming</title>
</svelte:head>

<main class="page-main">
  <h1>Commander Roster</h1>

  {#if players.length}
    <div class="roster-grid">
      {#each players as p}
        <a class="player-card" href="/player?id={p.id}">
          {#if p.photo}
            <img src={p.photo} alt="{p.name} avatar" class="player-photo" />
          {:else}
            <div class="player-photo player-photo--placeholder"></div>
          {/if}
          <div class="player-card-info">
            <span class="player-name">{p.name}</span>
            <span class="player-armies">{p.armies.join(', ')}</span>
            {#if p.total >= 1}
              <span class="player-record">{p.wins}W – {p.losses}L – {p.draws}D</span>
              {#if p.winRate !== null}
                <span class="player-winrate">{p.winRate}% WR</span>
              {/if}
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <p class="no-data">No commanders on the roster yet.</p>
  {/if}
</main>
