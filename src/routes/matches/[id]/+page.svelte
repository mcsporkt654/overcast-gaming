<script>
  import { matchVp, formatDiff } from '$lib/vp.js';
  import { longDate } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  $: match = data.match;
  $: vp = matchVp(match);

  const score = (value) => (value === null || value === undefined ? '—' : String(value));

  function formatUnit(unit) {
    if (!unit || !unit.unitName) return '';
    const count = unit.count && unit.count > 1 ? `${unit.count}× ` : '';
    const role = unit.role ? ` (${unit.role})` : '';
    const points = unit.points === null || unit.points === undefined ? '' : ` — ${unit.points} pts`;
    return `${count}${unit.unitName}${role}${points}`;
  }

  function metaHref(army) {
    const params = new URLSearchParams();
    if (army) params.set('army', army);
    if (match?.id) params.set('fromMatch', match.id);
    return `/meta?${params.toString()}`;
  }

  $: matchupHref = (() => {
    const params = new URLSearchParams();
    if (match?.armyUsed) params.set('army', match.armyUsed);
    if (match?.opponentArmy) params.set('opponent', match.opponentArmy);
    if (match?.id) params.set('fromMatch', match.id);
    return `/matchups?${params.toString()}`;
  })();
</script>

<svelte:head>
  <title>
    {match ? `${match.playerName} vs ${match.opponentName}` : 'Battle Record'} — Overcast Wargaming League
  </title>
</svelte:head>

{#if !match}
  <section class="page-header page">
    <div class="eyebrow">Battlefield Log</div>
    <h1>Battle Unavailable</h1>
    <p class="lede">Match data could not be loaded. Try again in a moment.</p>
    <div class="back-links"><a class="btn btn-secondary" href="/stats#matches">Back to match log</a></div>
  </section>
{:else}
  <section class="page-header page">
    <div class="eyebrow">Battlefield Log</div>
    <h1>{match.playerName} vs {match.opponentName}</h1>
    <p class="lede">
      {longDate(match.date)} · {match.missionName || 'Mission not set'}{match.eventName
        ? ` · ${match.eventName}`
        : ''}
    </p>
    <div class="back-links">
      <a class="btn btn-secondary" href="/stats#matches">Back to match log</a>
      <a class="btn btn-secondary" href="/players/{match.playerId}">{match.playerName}'s profile</a>
      <a class="btn btn-ghost" href={matchupHref}>{match.armyUsed} vs {match.opponentArmy} →</a>
      <a class="btn btn-ghost" href={metaHref(match.armyUsed)}>{match.armyUsed} meta →</a>
      <a class="btn btn-ghost" href={metaHref(match.opponentArmy)}>{match.opponentArmy} meta →</a>
    </div>
  </section>

  <section class="section page">
    <div class="stat-block">
      <div class="card">
        <b>
          {#if match.result === 'W'}WIN{:else if match.result === 'L'}LOSS{:else}DRAW{/if}
        </b>
        <span>Result</span>
      </div>
      <div class="card"><b>{formatDiff(vp.diff)}</b><span>Points diff</span></div>
      <div class="card"><b>{vp.player ?? '—'}</b><span>{match.playerName} VP</span></div>
      <div class="card"><b>{vp.opponent ?? '—'}</b><span>{match.opponentName} VP</span></div>
    </div>

    <div class="detail-grid">
      <div class="detail-panel">
        <h3>{match.playerName}</h3>
        <div class="detail-line"><span>Faction</span><b>{match.armyUsed || '—'}</b></div>
        <div class="detail-line"><span>Subfaction</span><b>{match.armySubfaction || '—'}</b></div>
        <div class="detail-line"><span>Army points</span><b>{score(match.armyPoints)}</b></div>
        <h3 class="unit-heading">Key units</h3>
        <ul class="unit-list">
          {#each match.playerUnits ?? [] as unit}
            <li>{formatUnit(unit)}</li>
          {:else}
            <li class="tmut">No key units recorded.</li>
          {/each}
        </ul>
      </div>

      <div class="detail-panel">
        <h3>{match.opponentName}</h3>
        <div class="detail-line"><span>Faction</span><b>{match.opponentArmy || '—'}</b></div>
        <div class="detail-line">
          <span>Subfaction</span><b>{match.opponentSubfaction || '—'}</b>
        </div>
        <div class="detail-line"><span>Army points</span><b>{score(match.opponentPoints)}</b></div>
        <h3 class="unit-heading">Key units</h3>
        <ul class="unit-list">
          {#each match.opponentUnits ?? [] as unit}
            <li>{formatUnit(unit)}</li>
          {:else}
            <li class="tmut">No key units recorded.</li>
          {/each}
        </ul>
      </div>
    </div>
  </section>

  <section class="section page">
    <div class="section-head">
      <div>
        <div class="eyebrow">Scoring</div>
        <h2>Objective Breakdown</h2>
      </div>
    </div>
    <div class="table-scroll">
      <table class="table">
        <caption class="visually-hidden">Objective scores by track</caption>
        <thead>
          <tr>
            <th>Track</th>
            <th style="text-align:right">{match.playerName}</th>
            <th style="text-align:right">{match.opponentName}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Primary</td>
            <td class="tnum">{score(match.primaryScorePlayer)}</td>
            <td class="tnum">{score(match.primaryScoreOpponent)}</td>
          </tr>
          <tr>
            <td>Secondary</td>
            <td class="tnum">{score(match.secondaryScorePlayer)}</td>
            <td class="tnum">{score(match.secondaryScoreOpponent)}</td>
          </tr>
          <tr>
            <td>Destruction</td>
            <td class="tnum">{score(match.destructionScorePlayer)}</td>
            <td class="tnum">{score(match.destructionScoreOpponent)}</td>
          </tr>
          <tr>
            <td><b>Total VP</b></td>
            <td class="tnum pos">{vp.player ?? '—'}</td>
            <td class="tnum">{vp.opponent ?? '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="section page">
    <div class="section-head">
      <div>
        <div class="eyebrow">After Action</div>
        <h2>Battle Notes</h2>
      </div>
    </div>
    <p class="notes">{match.battleNotes || 'No notes recorded for this battle.'}</p>
  </section>
{/if}

<style>
  .unit-heading {
    margin-top: var(--space-4);
  }
  .unit-list {
    margin: 0;
    padding-left: 1.15rem;
    font-size: 14px;
    color: color-mix(in srgb, var(--color-text) 75%, transparent);
  }
  .notes {
    white-space: pre-wrap;
    max-width: 72ch;
    color: color-mix(in srgb, var(--color-text) 80%, transparent);
  }
</style>
