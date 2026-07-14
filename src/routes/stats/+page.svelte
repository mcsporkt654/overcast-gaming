<script>
  /** @type {import('./$types').PageData} */
  export let data;

  const { stats, matches } = data;

  let armyFilter = '';
  let resultFilter = '';

  $: filtered = matches.filter((m) => {
    const matchArmy = !armyFilter || m.armyUsed === armyFilter || m.opponentArmy === armyFilter;
    const matchResult = !resultFilter || m.result === resultFilter;
    return matchArmy && matchResult;
  });

  $: armies = [...new Set(matches.flatMap((m) => [m.armyUsed, m.opponentArmy]))].sort();
</script>

<svelte:head>
  <title>Stats — Overcast Gaming</title>
</svelte:head>

<main class="page-main">
  <h1>League Stats</h1>

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

    {#if stats.leaderboard.length}
      <section class="leaderboard">
        <h2>Leaderboard</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th><th>Commander</th><th>W</th><th>L</th><th>D</th>
              <th>Games</th><th>Win %</th>
            </tr>
          </thead>
          <tbody>
            {#each stats.leaderboard as p, i}
              <tr>
                <td>{i + 1}</td>
                <td><a href="/player?id={p.id}">{p.name}</a></td>
                <td>{p.wins}</td><td>{p.losses}</td><td>{p.draws}</td>
                <td>{p.total}</td>
                <td>{p.winRate}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}

    {#if stats.armyWinRates.length}
      <section class="army-win-rates">
        <h2>Army Win Rates</h2>
        <table class="data-table">
          <thead>
            <tr><th>Army</th><th>Wins</th><th>Games</th><th>Win %</th></tr>
          </thead>
          <tbody>
            {#each stats.armyWinRates as a}
              <tr>
                <td>{a.army}</td>
                <td>{a.wins}</td><td>{a.total}</td>
                <td>{a.winRate}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  {/if}

  <section class="match-log">
    <h2>Match Log</h2>
    <div class="filters">
      <label>
        Army
        <select bind:value={armyFilter}>
          <option value="">All</option>
          {#each armies as a}<option value={a}>{a}</option>{/each}
        </select>
      </label>
      <label>
        Result
        <select bind:value={resultFilter}>
          <option value="">All</option>
          <option value="W">Win</option>
          <option value="L">Loss</option>
          <option value="D">Draw</option>
        </select>
      </label>
    </div>

    {#if filtered.length}
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Commander</th><th>Army</th>
            <th>Opponent</th><th>Opp. Army</th>
            <th>Result</th><th>Pts Diff</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as m}
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
      <p class="no-data">No matches match the current filters.</p>
    {/if}
  </section>
</main>
