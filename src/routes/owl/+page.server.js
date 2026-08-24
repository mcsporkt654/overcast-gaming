/** @typedef {{
 * id: string,
 * playerId: string,
 * playerName: string,
 * armyUsed: string,
 * result: 'W'|'L'|'D',
 * divisionName?: string,
 * matchType?: string,
 * primaryScorePlayer?: number | null,
 * secondaryScorePlayer?: number | null,
 * destructionScorePlayer?: number | null
 * }} MatchRow */

/** @param {number | null | undefined} value */
function score(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** @param {MatchRow[]} matches */
function buildDivisionStandings(matches) {
  const divisions = ['Premier', 'Stump'];
  /** @type {Record<'Premier'|'Stump', any[]>} */
  const output = { Premier: [], Stump: [] };

  for (const division of divisions) {
    /** @type {Map<string, any>} */
    const byPlayer = new Map();

    for (const match of matches) {
      if (match.matchType && match.matchType !== 'league') continue;
      if (match.divisionName !== division) continue;

      const existing = byPlayer.get(match.playerId) || {
        id: match.playerId,
        name: match.playerName,
        armyCounts: new Map(),
        wins: 0,
        losses: 0,
        draws: 0,
        games: 0,
        totalVp: 0
      };

      existing.games += 1;
      if (match.result === 'W') existing.wins += 1;
      else if (match.result === 'L') existing.losses += 1;
      else existing.draws += 1;

      existing.totalVp +=
        score(match.primaryScorePlayer) +
        score(match.secondaryScorePlayer) +
        score(match.destructionScorePlayer);

      if (match.armyUsed) {
        existing.armyCounts.set(match.armyUsed, (existing.armyCounts.get(match.armyUsed) || 0) + 1);
      }

      byPlayer.set(match.playerId, existing);
    }

    const rows = [...byPlayer.values()]
      .map((row) => {
        const topArmy = [...row.armyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        return {
          id: row.id,
          name: row.name,
          army: topArmy,
          wins: row.wins,
          losses: row.losses,
          draws: row.draws,
          games: row.games,
          totalVp: row.totalVp,
          avgVp: row.games ? Math.round((row.totalVp / row.games) * 10) / 10 : null,
          status: 'safe'
        };
      })
      .sort((a, b) => {
        if (b.totalVp !== a.totalVp) return b.totalVp - a.totalVp;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.name.localeCompare(b.name);
      })
      .map((row, i) => ({ ...row, rank: i + 1 }));

    output[/** @type {'Premier'|'Stump'} */ (division)] = rows;
  }

  const promoted = Math.min(3, output.Stump.length);
  for (let i = 0; i < promoted; i += 1) {
    output.Stump[i].status = 'promotion';
  }

  const relegated = Math.min(3, output.Premier.length);
  for (let i = output.Premier.length - relegated; i < output.Premier.length; i += 1) {
    if (i >= 0) output.Premier[i].status = 'relegation';
  }

  return {
    divisions: output,
    projected: {
      promoted: output.Stump.filter((r) => r.status === 'promotion').map((r) => r.name),
      relegated: output.Premier.filter((r) => r.status === 'relegation').map((r) => r.name)
    }
  };
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, url }) {
  const divisionParam = String(url.searchParams.get('division') || 'premier').toLowerCase();
  const selectedDivision = divisionParam === 'stump' ? 'stump' : 'premier';

  const seasonsRes = await fetch('/api/seasons');
  const seasons = seasonsRes.ok ? await seasonsRes.json() : [];

  const seasonIdParam = url.searchParams.get('seasonId') || '';
  const selectedSeason = seasons.find((s) => String(s.id) === seasonIdParam) || seasons[0] || null;
  const selectedSeasonId = selectedSeason ? String(selectedSeason.id) : '';

  const matchesRes = await fetch(
    selectedSeasonId ? `/api/matches?seasonId=${encodeURIComponent(selectedSeasonId)}` : '/api/matches'
  );
  const matches = matchesRes.ok ? await matchesRes.json() : [];

  const { divisions, projected } = buildDivisionStandings(matches);

  return {
    seasons,
    selectedSeasonId,
    selectedSeasonYear: selectedSeason?.seasonYear || null,
    selectedDivision,
    standings: divisions,
    projected
  };
}
