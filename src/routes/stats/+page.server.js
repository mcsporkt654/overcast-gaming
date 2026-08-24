/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, url }) {
  const includeExhibition = url.searchParams.get('includeExhibition') === '1';
  const seasonId = url.searchParams.get('seasonId') || '';
  const divisionId = url.searchParams.get('divisionId') || '';
  const division = url.searchParams.get('division') || '';

  const params = new URLSearchParams();
  if (includeExhibition) params.set('includeExhibition', '1');
  if (seasonId) params.set('seasonId', seasonId);
  if (divisionId) params.set('divisionId', divisionId);
  if (division) params.set('division', division);
  const query = params.toString() ? `?${params.toString()}` : '';

  const [statsRes, matchesRes] = await Promise.all([
    fetch(`/api/stats${query}`),
    fetch(`/api/matches${query}`)
  ]);

  const [seasonsRes, divisionsRes] = await Promise.all([
    fetch('/api/seasons'),
    fetch(seasonId ? `/api/divisions?seasonId=${encodeURIComponent(seasonId)}` : '/api/divisions')
  ]);

  const apiUnavailable = statsRes.status === 503 || matchesRes.status === 503;
  const stats = statsRes.ok ? await statsRes.json() : null;
  const matches = matchesRes.ok ? await matchesRes.json() : [];
  const seasons = seasonsRes.ok ? await seasonsRes.json() : [];
  const divisions = divisionsRes.ok ? await divisionsRes.json() : [];

  return {
    stats,
    matches,
    seasons,
    divisions,
    apiUnavailable,
    filters: {
      includeExhibition,
      seasonId,
      divisionId,
      division
    }
  };
}
