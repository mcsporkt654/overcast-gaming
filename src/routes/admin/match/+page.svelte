<script>
  import { onMount } from 'svelte';
  import {
    armyNames,
    loadArmies,
    loadDetachments,
    loadDivisions,
    loadEvents,
    loadMissions,
    loadPlayers,
    loadSeasonPlayerDivisions,
    loadSeasons,
    splitList,
    subfactionsFor
  } from '$lib/adminReference.js';

  const CUSTOM = '__custom__';
  const today = () => new Date().toISOString().split('T')[0];

  /** @type {{ name: string, subfactions?: string[] }[]} */
  let armies = [];
  /** @type {{ id: string, name: string, missionPack?: string }[]} */
  let missions = [];
  /** @type {{ id: string, name: string, startDate?: string }[]} */
  let events = [];
  /** @type {{ id: string, name: string }[]} */
  let players = [];
  /** @type {{ id: number, seasonYear: number, label: string }[]} */
  let seasons = [];
  /** @type {{ id: number, seasonId: number, seasonYear: number, name: string }[]} */
  let divisions = [];
  /** @type {{ id: number, armyName: string, name: string, ruleset: string }[]} */
  let playerDetachments = [];
  /** @type {{ id: number, armyName: string, name: string, ruleset: string }[]} */
  let opponentDetachments = [];
  /** @type {{ playerId: number, playerSlug: string, playerName: string, divisionId: number, divisionName: string, source: string }[]} */
  let seasonAssignments = [];
  let referenceLoaded = false;

  let date = today();
  let playerId = '';
  let armyUsed = '';
  let armyUsedCustom = '';
  let armySubfaction = '';
  let armySubfactionCustom = '';
  let armyPoints = '';
  let opponentName = '';
  let opponentArmy = '';
  let opponentArmyCustom = '';
  let opponentSubfaction = '';
  let opponentSubfactionCustom = '';
  let opponentPoints = '';
  let missionId = '';
  let eventId = '';
  let seasonId = '';
  let divisionId = '';
  let matchType = 'league';
  let ruleset = 'WH40K';
  let playerDetachmentId = '';
  let opponentDetachmentId = '';
  let primaryScorePlayer = '';
  let primaryScoreOpponent = '';
  let secondaryScorePlayer = '';
  let secondaryScoreOpponent = '';
  let destructionScorePlayer = '';
  let destructionScoreOpponent = '';
  let playerUnits = '';
  let opponentUnits = '';
  let battleNotes = '';
  let result = '';
  let pointsDiff = '';

  let submitting = false;
  let creatingSeason = false;
  let showSeasonForm = false;
  let newSeasonYear = String(new Date().getFullYear());
  let newSeasonLabel = '';
  let newSeasonApplyRollover = true;
  let alertKind = /** @type {'' | 'success' | 'error'} */ ('');
  let alertText = '';

  let previousSeasonId = '';
  let previousPlayerId = '';
  let previousPlayerArmy = '';
  let previousOpponentArmy = '';

  $: availableArmies = armyNames(armies);
  $: playerSubfactions = subfactionsFor(armies, armyUsed);
  $: opponentSubfactions = subfactionsFor(armies, opponentArmy);
  // Switching faction invalidates whatever subfaction was picked for the old one.
  $: if (armyUsed !== undefined) armySubfaction = '';
  $: if (opponentArmy !== undefined) opponentSubfaction = '';

  $: resolvedPlayerArmy = resolve(armyUsed, armyUsedCustom);
  $: resolvedOpponentArmy = resolve(opponentArmy, opponentArmyCustom);

  $: if (referenceLoaded && seasonId !== previousSeasonId) {
    previousSeasonId = seasonId;
    divisionId = '';
    void refreshSeasonScopedReferences();
  }

  $: if (referenceLoaded && playerId !== previousPlayerId) {
    previousPlayerId = playerId;
    if (matchType === 'league') applyAssignedDivision();
  }

  $: if (referenceLoaded && resolvedPlayerArmy !== previousPlayerArmy) {
    previousPlayerArmy = resolvedPlayerArmy;
    playerDetachmentId = '';
    void refreshPlayerDetachments();
  }

  $: if (referenceLoaded && resolvedOpponentArmy !== previousOpponentArmy) {
    previousOpponentArmy = resolvedOpponentArmy;
    opponentDetachmentId = '';
    void refreshOpponentDetachments();
  }

  onMount(async () => {
    [armies, missions, events, players, seasons] = await Promise.all([
      loadArmies(),
      loadMissions(),
      loadEvents(),
      loadPlayers(),
      loadSeasons()
    ]);
    if (seasons.length) {
      seasonId = String(seasons[0].id);
      await refreshSeasonScopedReferences();
    }
    referenceLoaded = true;
  });

  function applyAssignedDivision() {
    if (!seasonAssignments.length || !playerId) return;
    const assigned = seasonAssignments.find((a) => a.playerSlug === playerId);
    if (assigned && divisions.some((d) => Number(d.id) === Number(assigned.divisionId))) {
      divisionId = String(assigned.divisionId);
    }
  }

  async function refreshSeasonScopedReferences() {
    const [nextDivisions, nextAssignments] = await Promise.all([
      loadDivisions(seasonId || null),
      loadSeasonPlayerDivisions(seasonId || null)
    ]);
    divisions = nextDivisions;
    seasonAssignments = nextAssignments;
    if (matchType === 'league') applyAssignedDivision();
  }

  async function refreshPlayerDetachments() {
    playerDetachments = resolvedPlayerArmy ? await loadDetachments(resolvedPlayerArmy, ruleset) : [];
  }

  async function refreshOpponentDetachments() {
    opponentDetachments = resolvedOpponentArmy ? await loadDetachments(resolvedOpponentArmy, ruleset) : [];
  }

  async function createSeason() {
    if (creatingSeason) return;
    creatingSeason = true;
    alertKind = '';
    alertText = '';
    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonYear: Number.parseInt(newSeasonYear, 10),
          label: newSeasonLabel.trim(),
          applyRollover: newSeasonApplyRollover
        })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.error || 'Failed to create season.');

      seasons = await loadSeasons();
      seasonId = String(body.season.id);
      await refreshSeasonScopedReferences();
      showSeasonForm = false;
      newSeasonLabel = '';

      const rollover = body.rollover;
      if (rollover?.applied) {
        const promoted = Array.isArray(rollover.promoted) && rollover.promoted.length
          ? rollover.promoted.join(', ')
          : 'none';
        const relegated = Array.isArray(rollover.relegated) && rollover.relegated.length
          ? rollover.relegated.join(', ')
          : 'none';
        alertKind = 'success';
        alertText = `✓ Season ${body.season.seasonYear} created. Rollover from ${rollover.fromSeasonYear}: promoted ${promoted}; relegated ${relegated}.`;
      } else if (body.created) {
        alertKind = 'success';
        alertText = `✓ Season ${body.season.seasonYear} created.`;
      } else {
        alertKind = 'success';
        alertText = `✓ Season ${body.season.seasonYear} updated.`;
      }
    } catch (err) {
      alertKind = 'error';
      alertText = '✗ Error: ' + (err instanceof Error ? err.message : String(err));
    } finally {
      creatingSeason = false;
    }
  }

  /** @param {string} selected @param {string} custom */
  function resolve(selected, custom) {
    return selected === CUSTOM ? custom.trim() : selected;
  }

  function resetForm() {
    date = today();
    playerId = '';
    armyUsed = '';
    armyUsedCustom = '';
    armySubfaction = '';
    armySubfactionCustom = '';
    armyPoints = '';
    opponentName = '';
    opponentArmy = '';
    opponentArmyCustom = '';
    opponentSubfaction = '';
    opponentSubfactionCustom = '';
    opponentPoints = '';
    missionId = '';
    eventId = '';
    divisionId = '';
    matchType = 'league';
    ruleset = 'WH40K';
    playerDetachmentId = '';
    opponentDetachmentId = '';
    primaryScorePlayer = '';
    primaryScoreOpponent = '';
    secondaryScorePlayer = '';
    secondaryScoreOpponent = '';
    destructionScorePlayer = '';
    destructionScoreOpponent = '';
    playerUnits = '';
    opponentUnits = '';
    battleNotes = '';
    result = '';
    pointsDiff = '';
  }

  async function submitMatch() {
    if (submitting) return;
    submitting = true;
    alertKind = '';
    alertText = '';

    const payload = {
      date,
      playerId,
      armyUsed: resolve(armyUsed, armyUsedCustom),
      armySubfaction: resolve(armySubfaction, armySubfactionCustom),
      armyPoints,
      playerUnits: splitList(playerUnits),
      opponentName: opponentName.trim(),
      opponentArmy: resolve(opponentArmy, opponentArmyCustom),
      opponentSubfaction: resolve(opponentSubfaction, opponentSubfactionCustom),
      opponentPoints,
      opponentUnits: splitList(opponentUnits),
      missionId,
      eventId,
      seasonId: seasonId || null,
      divisionId: divisionId || null,
      matchType,
      ruleset,
      playerDetachmentId: playerDetachmentId || null,
      opponentDetachmentId: opponentDetachmentId || null,
      primaryScorePlayer,
      primaryScoreOpponent,
      secondaryScorePlayer,
      secondaryScoreOpponent,
      destructionScorePlayer,
      destructionScoreOpponent,
      result,
      pointsDiff,
      battleNotes: battleNotes.trim()
    };

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        alertKind = 'error';
        alertText = 'Session expired. Reload the page and log in again.';
        return;
      }
      if (!res.ok || !body.success) throw new Error(body.error || 'Unknown error');

      alertKind = 'success';
      alertText = `✓ Match recorded: ${body.match.playerName} vs ${body.match.opponentName} — ${body.match.result}`;
      resetForm();
    } catch (err) {
      alertKind = 'error';
      alertText = '✗ Error: ' + (err instanceof Error ? err.message : String(err));
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Admin · Record a Match — Overcast Wargaming League</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="section">
  <div class="match-form-wrap">
    <div class="admin-form-card">
      <h3>⚔ Record a Match</h3>

      {#if alertText}
        <div class="alert {alertKind}">{alertText}</div>
      {/if}

      {#if referenceLoaded && !players.length}
        <div class="alert error">
          No players on the roster yet — <a href="/admin/roster">add a commander</a> before recording a match.
        </div>
      {/if}

      <form on:submit|preventDefault={submitMatch}>
        <div class="form-group">
          <label for="match-date">Date</label>
          <input type="date" id="match-date" bind:value={date} required />
        </div>

        <div class="form-group">
          <label for="match-player">Player</label>
          <select id="match-player" bind:value={playerId} required>
            <option value="">— Select Player —</option>
            {#each players as player}
              <option value={player.id}>{player.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="match-season">Season</label>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <select id="match-season" bind:value={seasonId} required>
              <option value="">— Select Season —</option>
              {#each seasons as season}
                <option value={String(season.id)}>{season.seasonYear}</option>
              {/each}
            </select>
            <button type="button" class="btn btn-secondary" on:click={() => (showSeasonForm = !showSeasonForm)}>
              + Add Season
            </button>
          </div>
        </div>

        {#if showSeasonForm}
          <div class="form-group" style="border:1px solid var(--border); border-radius:10px; padding:0.8rem;">
            <label for="new-season-year">New Season Year</label>
            <input id="new-season-year" type="number" bind:value={newSeasonYear} min="2000" max="2200" />
            <label for="new-season-label" style="margin-top:0.6rem; display:block;">Label <span style="color:var(--text-muted)">(optional)</span></label>
            <input id="new-season-label" type="text" bind:value={newSeasonLabel} placeholder="e.g. Season 2028" />
            <label style="display:flex; align-items:center; gap:0.5rem; margin-top:0.6rem;">
              <input type="checkbox" bind:checked={newSeasonApplyRollover} />
              Auto-apply promotion/relegation from prior season
            </label>
            <button type="button" class="btn btn-primary" style="margin-top:0.6rem;" disabled={creatingSeason} on:click={createSeason}>
              {creatingSeason ? 'Creating...' : 'Create Season'}
            </button>
          </div>
        {/if}

        <div class="form-group">
          <label for="match-division">Division</label>
          <select id="match-division" bind:value={divisionId} required={matchType === 'league'}>
            <option value="">— Select Division —</option>
            {#each divisions as division}
              <option value={String(division.id)}>{division.name}</option>
            {/each}
          </select>
          {#if matchType === 'league' && playerId}
            <p class="form-hint">Division defaults from season rollover assignments when available.</p>
          {/if}
        </div>

        <div class="form-group">
          <label for="match-type">Match Type</label>
          <select id="match-type" bind:value={matchType}>
            <option value="league">League</option>
            <option value="exhibition">Exhibition</option>
          </select>
        </div>

        <div class="form-group">
          <label for="match-ruleset">Ruleset</label>
          <input id="match-ruleset" type="text" bind:value={ruleset} placeholder="WH40K" required />
        </div>

        <div class="form-group">
          <label for="match-army">Army Used</label>
          <select id="match-army" bind:value={armyUsed} required>
            <option value="">— Select Army —</option>
            <option value={CUSTOM}>+ Custom Army...</option>
            {#each availableArmies as army}
              <option value={army}>{army}</option>
            {/each}
          </select>
        </div>
        {#if armyUsed === CUSTOM}
          <div class="form-group">
            <label for="match-army-custom">Custom Army Name</label>
            <input type="text" id="match-army-custom" placeholder="e.g. Harlequins" bind:value={armyUsedCustom} required />
          </div>
        {/if}

        <div class="form-group">
          <label for="match-subfaction">Player Subfaction <span style="color:var(--text-muted)">(optional)</span></label>
          <select id="match-subfaction" bind:value={armySubfaction}>
            <option value="">— Select Subfaction —</option>
            <option value={CUSTOM}>+ Custom Subfaction...</option>
            {#each playerSubfactions as sub}
              <option value={sub}>{sub}</option>
            {/each}
          </select>
        </div>
        {#if armySubfaction === CUSTOM}
          <div class="form-group">
            <label for="match-subfaction-custom">Custom Player Subfaction</label>
            <input type="text" id="match-subfaction-custom" placeholder="e.g. Vanguard Spearhead" bind:value={armySubfactionCustom} required />
          </div>
        {/if}

        <div class="form-group">
          <label for="match-army-points">Player Army Points <span style="color:var(--text-muted)">(optional)</span></label>
          <input type="number" id="match-army-points" placeholder="e.g. 2000" bind:value={armyPoints} />
        </div>

        <div class="form-group">
          <label for="match-player-detachment">Player Detachment <span style="color:var(--text-muted)">(optional)</span></label>
          <select id="match-player-detachment" bind:value={playerDetachmentId}>
            <option value="">— Select Detachment —</option>
            {#each playerDetachments as det}
              <option value={String(det.id)}>{det.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="match-opponent">Opponent Name</label>
          <input type="text" id="match-opponent" placeholder="e.g. Silas Dorn" bind:value={opponentName} required />
        </div>

        <div class="form-group">
          <label for="match-opp-army">Opponent's Army</label>
          <select id="match-opp-army" bind:value={opponentArmy} required>
            <option value="">— Select Army —</option>
            <option value={CUSTOM}>+ Custom Army...</option>
            {#each availableArmies as army}
              <option value={army}>{army}</option>
            {/each}
          </select>
        </div>
        {#if opponentArmy === CUSTOM}
          <div class="form-group">
            <label for="match-opp-army-custom">Custom Opponent Army</label>
            <input type="text" id="match-opp-army-custom" placeholder="e.g. Leagues of Votann" bind:value={opponentArmyCustom} required />
          </div>
        {/if}

        <div class="form-group">
          <label for="match-opp-subfaction">Opponent Subfaction <span style="color:var(--text-muted)">(optional)</span></label>
          <select id="match-opp-subfaction" bind:value={opponentSubfaction}>
            <option value="">— Select Subfaction —</option>
            <option value={CUSTOM}>+ Custom Subfaction...</option>
            {#each opponentSubfactions as sub}
              <option value={sub}>{sub}</option>
            {/each}
          </select>
        </div>
        {#if opponentSubfaction === CUSTOM}
          <div class="form-group">
            <label for="match-opp-subfaction-custom">Custom Opponent Subfaction</label>
            <input type="text" id="match-opp-subfaction-custom" placeholder="e.g. Righteous Crusaders" bind:value={opponentSubfactionCustom} required />
          </div>
        {/if}

        <div class="form-group">
          <label for="match-opp-points">Opponent Army Points <span style="color:var(--text-muted)">(optional)</span></label>
          <input type="number" id="match-opp-points" placeholder="e.g. 2000" bind:value={opponentPoints} />
        </div>

        <div class="form-group">
          <label for="match-opponent-detachment">Opponent Detachment <span style="color:var(--text-muted)">(optional)</span></label>
          <select id="match-opponent-detachment" bind:value={opponentDetachmentId}>
            <option value="">— Select Detachment —</option>
            {#each opponentDetachments as det}
              <option value={String(det.id)}>{det.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="match-mission">Mission <span style="color:var(--text-muted)">(optional)</span></label>
          <select id="match-mission" bind:value={missionId}>
            <option value="">— Select Mission —</option>
            {#each missions as mission}
              <option value={mission.id}>{mission.missionPack ? `${mission.name} (${mission.missionPack})` : mission.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="match-event">Event <span style="color:var(--text-muted)">(optional)</span></label>
          <select id="match-event" bind:value={eventId}>
            <option value="">— No Event —</option>
            {#each events as event}
              <option value={event.id}>{event.startDate ? `${event.name} (${event.startDate})` : event.name}</option>
            {/each}
          </select>
          <p class="form-hint">Use events to group local tournaments or campaign rounds.</p>
        </div>

        <div class="form-group">
          <label for="match-primary-player" style="color:var(--accent); font-size:0.7rem; letter-spacing:0.12em; text-transform:uppercase;">
            Objective Scores <span style="color:var(--text-muted); font-weight:400;">(optional)</span>
          </label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.4rem;">
            <input type="number" id="match-primary-player" placeholder="Primary (player)" bind:value={primaryScorePlayer} />
            <input type="number" placeholder="Primary (opponent)" bind:value={primaryScoreOpponent} aria-label="Primary score (opponent)" />
            <input type="number" placeholder="Secondary (player)" bind:value={secondaryScorePlayer} aria-label="Secondary score (player)" />
            <input type="number" placeholder="Secondary (opponent)" bind:value={secondaryScoreOpponent} aria-label="Secondary score (opponent)" />
            <input type="number" placeholder="Destruction (player)" bind:value={destructionScorePlayer} aria-label="Destruction score (player)" />
            <input type="number" placeholder="Destruction (opponent)" bind:value={destructionScoreOpponent} aria-label="Destruction score (opponent)" />
          </div>
        </div>

        <div class="form-group">
          <label for="match-player-units">Player Key Units <span style="color:var(--text-muted)">(comma-separated, optional)</span></label>
          <textarea id="match-player-units" rows="3" placeholder="e.g. Terminators, Redemptor Dreadnought, Librarian" bind:value={playerUnits}></textarea>
        </div>

        <div class="form-group">
          <label for="match-opp-units">Opponent Key Units <span style="color:var(--text-muted)">(comma-separated, optional)</span></label>
          <textarea id="match-opp-units" rows="3" placeholder="e.g. Crisis Suits, Breachers, Commander" bind:value={opponentUnits}></textarea>
        </div>

        <div class="form-group">
          <label for="match-notes">Battle Notes <span style="color:var(--text-muted)">(optional)</span></label>
          <textarea id="match-notes" rows="4" placeholder="Key turning points, tactical notes, and notable unit performance..." bind:value={battleNotes}></textarea>
        </div>

        <div class="form-group">
          <label for="match-result">Result</label>
          <select id="match-result" bind:value={result} required>
            <option value="">— Select Result —</option>
            <option value="W">Win</option>
            <option value="L">Loss</option>
            <option value="D">Draw</option>
          </select>
        </div>

        <div class="form-group">
          <label for="match-points">Points Differential <span style="color:var(--text-muted)">(optional)</span></label>
          <input type="number" id="match-points" placeholder="e.g. 15 or -8" bind:value={pointsDiff} />
          <p class="form-hint">Positive = you scored more. Negative = opponent scored more.</p>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%; margin-top:0.5rem" disabled={submitting}>
          {submitting ? 'Recording...' : '⚔ Record Match'}
        </button>
      </form>
    </div>
  </div>
</section>

<style>
  .match-form-wrap {
    max-width: 640px;
    margin: 0 auto;
  }
</style>
