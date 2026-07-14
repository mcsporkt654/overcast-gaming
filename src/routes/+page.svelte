<script>
  /** @type {import('./$types').PageData} */
  export let data;

  const { stats, recentMatches } = data;
</script>

<svelte:head>
  <title>Overcast Gaming — Warhammer 40K League</title>
</svelte:head>

<main class="page-main">
  {#if stats}
    <section class="stats-bar">
      <div class="stat-card">
        <span class="stat-label">Commanders</span>
        <span class="stat-value">{stats.totalPlayers}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Games Played</span>
        <span class="stat-value">{stats.totalGames}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Top Faction</span>
        <span class="stat-value">{stats.mostPlayedArmy}</span>
      </div>
    </section>
  {/if}

  <section class="recent-matches">
    <h2>Recent Matches</h2>
    {#if recentMatches.length}
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Commander</th>
            <th>Army</th>
            <th>Opponent</th>
            <th>Opp. Army</th>
            <th>Result</th>
            <th>Pts Diff</th>
          </tr>
        </thead>
        <tbody>
          {#each recentMatches as m}
            <tr>
              <td>{m.date}</td>
              <td><a href="/player?id={m.playerId}">{m.playerName}</a></td>
              <td>{m.armyUsed}</td>
              <td>{m.opponentName}</td>
              <td>{m.opponentArmy}</td>
              <td class="result result-{m.result.toLowerCase()}">{m.result}</td>
              <td>{m.pointsDiff ?? '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="no-data">No matches recorded yet.</p>
    {/if}
  </section>
</main>
