<script>
  import { matchVp, formatDiff } from '$lib/vp.js';
  import { shortDate, record } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  let armyFilter = '';

  $: analytics = data.analytics;
  $: player = analytics?.player ?? null;
  $: summary = analytics?.summary ?? null;
  $: factionStats = analytics?.factionStats ?? [];
  $: subfactionStats = analytics?.subfactionStats ?? [];
  $: matches = analytics?.matches ?? [];

  $: totalVp = matches.reduce((sum, m) => sum + (matchVp(m).player ?? 0), 0);
  $: filteredMatches = armyFilter ? matches.filter((m) => m.armyUsed === armyFilter) : matches;
  $: socialLinks = Object.entries(player?.socials ?? {});
</script>

<svelte:head>
  <title>{player?.name ?? 'Commander'} — Overcast Wargaming League</title>
  <meta
    name="description"
    content={player
      ? `${player.name}'s record, factions and battle history in the Overcast Wargaming League.`
      : 'Commander profile.'}
  />
</svelte:head>

{#if !player}
  <section class="page-header page">
    <div class="eyebrow">Order of Battle</div>
    <h1>Commander Unavailable</h1>
    <p class="lede">Player data could not be loaded. Try again in a moment.</p>
    <div class="back-links"><a class="btn btn-secondary" href="/roster">Back to roster</a></div>
  </section>
{:else}
  <section class="page-header page">
    <div class="eyebrow">Order of Battle</div>
    <h1>{player.name}</h1>
    <p class="lede">
      {(player.armies ?? []).join(' · ') || 'No army logged'} — {summary.total}
      {summary.total === 1 ? 'battle' : 'battles'} logged in the OWL.
    </p>
    <div class="back-links">
      <a class="btn btn-secondary" href="/roster">Back to roster</a>
      <a class="btn btn-secondary" href="/stats#standings">Full standings</a>
      {#each socialLinks as [network, url]}
        <a class="btn btn-ghost" href={url} target="_blank" rel="noopener">{network} →</a>
      {/each}
    </div>
  </section>

  <section class="section page">
    <div class="stat-block">
      <div class="card">
        <b>{record(summary.wins, summary.losses, summary.draws)}</b>
        <span>Record</span>
      </div>
      <div class="card"><b>{summary.winRate}%</b><span>Win rate</span></div>
      <div class="card"><b>{summary.total}</b><span>Battles</span></div>
      <div class="card"><b>{totalVp}</b><span>Total VP</span></div>
    </div>

    {#if player.photo}
      <img class="profile-photo" src={player.photo} alt={player.name} />
    {/if}
  </section>

  {#if factionStats.length}
    <section class="section page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Armies Fielded</div>
          <h2>Faction Record</h2>
        </div>
      </div>
      <div class="faction-grid">
        {#each factionStats as faction (faction.army)}
          <div class="faction-row">
            <b>{faction.army}</b>
            <span>{record(faction.wins, faction.losses, faction.draws)} · {faction.winRate}%</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if subfactionStats.length > 1}
    <section class="section page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Detachments</div>
          <h2>Subfaction Record</h2>
        </div>
      </div>
      <div class="faction-grid">
        {#each subfactionStats as sub (sub.army + sub.subfaction)}
          <div class="faction-row">
            <b>{sub.subfaction}</b>
            <span>{sub.army} · {record(sub.wins, sub.losses, sub.draws)}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <section class="section page">
    <div class="section-head">
      <div>
        <div class="eyebrow">Battlefield Log</div>
        <h2>Battle History</h2>
      </div>
      {#if factionStats.length > 1}
        <div class="field">
          <label for="army-filter">Army</label>
          <select class="input" id="army-filter" bind:value={armyFilter}>
            <option value="">All armies</option>
            {#each factionStats as faction (faction.army)}
              <option value={faction.army}>{faction.army}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <div class="table-scroll">
      <table class="table">
        <caption class="visually-hidden">Battle history for {player.name}</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Army</th>
            <th>Opponent</th>
            <th>Opp. Army</th>
            <th>Mission</th>
            <th>Result</th>
            <th style="text-align:right">Pts Diff</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredMatches as match (match.id)}
            {@const vp = matchVp(match)}
            <tr>
              <td><a href="/matches/{match.id}">{shortDate(match.date)}</a></td>
              <td class="tmut">{match.armyUsed}</td>
              <td>{match.opponentName}</td>
              <td class="tmut">{match.opponentArmy}</td>
              <td class="tmut">{match.missionName || '—'}</td>
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
            <tr><td colspan="7" class="empty-row">No battles logged yet.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}

<style>
  .profile-photo {
    width: 100%;
    max-width: 320px;
    filter: grayscale(1) contrast(1.08);
  }
  .section-head .field {
    min-width: 200px;
  }
</style>
