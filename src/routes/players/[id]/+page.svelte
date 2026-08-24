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
  $: recentForm = matches.slice(0, 5);
  $: signatureArmies = factionStats.slice(0, 3);
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
      <a class="btn btn-secondary" href="/owl">Full standings</a>
      {#each socialLinks as [network, url]}
        <a class="btn btn-ghost" href={url} target="_blank" rel="noopener">{network} →</a>
      {/each}
    </div>
  </section>

  <section class="section page">
    <div class="profile-grid">
      {#if player.photo}
        <img class="profile-photo" src={player.photo} alt={player.name} />
      {/if}

      <div class="profile-summary">
        <div class="stat-block">
          <div class="card">
            <b>{record(summary.wins, summary.losses, summary.draws)}</b>
            <span>Record</span>
          </div>
          <div class="card"><b>{summary.winRate}%</b><span>Win rate</span></div>
          <div class="card"><b>{summary.total}</b><span>Battles</span></div>
          <div class="card"><b>{totalVp}</b><span>Total VP</span></div>
        </div>

        <div class="snapshot-grid">
          <article class="detail-panel">
            <h3>Recent Form</h3>
            <div class="form-strip">
              {#each recentForm as match (match.id)}
                {#if match.result === 'W'}
                  <span class="form-chip win" title={shortDate(match.date)}>W</span>
                {:else if match.result === 'L'}
                  <span class="form-chip loss" title={shortDate(match.date)}>L</span>
                {:else}
                  <span class="form-chip draw" title={shortDate(match.date)}>D</span>
                {/if}
              {:else}
                <span class="text-muted">No recent matches yet.</span>
              {/each}
            </div>
          </article>

          <article class="detail-panel">
            <h3>Signature Armies</h3>
            <div class="chip-wrap">
              {#each signatureArmies as army (army.army)}
                <span class="army-chip">{army.army} · {army.winRate}%</span>
              {:else}
                <span class="text-muted">No army trends yet.</span>
              {/each}
            </div>
          </article>
        </div>
      </div>
    </div>
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
    height: 100%;
    min-height: 340px;
    object-fit: cover;
    border: 1px solid var(--color-divider);
    filter: grayscale(0.3) contrast(1.06);
  }

  .profile-grid {
    display: grid;
    grid-template-columns: minmax(280px, 360px) 1fr;
    gap: var(--space-5);
    align-items: stretch;
  }

  .profile-summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .snapshot-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .form-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .form-chip {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    font-family: var(--font-heading);
    font-weight: var(--font-heading-weight);
    font-size: 13px;
    border: 1px solid var(--color-divider);
  }

  .form-chip.win {
    background: color-mix(in srgb, var(--color-accent) 24%, transparent);
    color: var(--color-accent-200);
  }

  .form-chip.loss {
    background: color-mix(in srgb, var(--loss) 20%, transparent);
    color: #f4bcbc;
  }

  .form-chip.draw {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: color-mix(in srgb, var(--color-text) 76%, transparent);
  }

  .chip-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .army-chip {
    border: 1px solid var(--color-divider);
    padding: 4px 10px;
    font-size: 12px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .section-head .field {
    min-width: 200px;
  }

  @media (max-width: 980px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }

    .profile-photo {
      max-height: 360px;
    }
  }

  @media (max-width: 760px) {
    .snapshot-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
