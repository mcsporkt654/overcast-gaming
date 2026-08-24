/**
 * Reference data shared by the admin sub-pages. `/api/armies` is the source of
 * truth (it also carries subfactions); the hard-coded list is only a fallback so
 * the roster form still works if that endpoint is down.
 */

export const FALLBACK_ARMIES = [
  'Adeptus Custodes', 'Adeptus Mechanicus', 'Aeldari', 'Agents of the Imperium',
  'Blood Angels', 'Chaos Daemons', 'Chaos Knights', 'Chaos Space Marines',
  'Dark Angels', 'Death Guard', 'Deathwatch', 'Drukhari',
  'Genestealer Cults', 'Grey Knights', 'Imperial Fists',
  'Imperial Guard / Astra Militarum', 'Imperial Knights',
  'Leagues of Votann', 'Necrons', 'Orks',
  'Salamanders', 'Sisters of Battle / Adepta Sororitas',
  'Space Marines', 'Space Wolves', "T'au Empire",
  'Thousand Sons', 'Tyranids / Hive Fleet', 'Ultramarines',
  'World Eaters'
];

/**
 * @param {string} url
 * @returns {Promise<any[]>} the parsed array, or [] if the request failed
 */
async function fetchList(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const payload = await res.json();
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

/** @returns {Promise<{ name: string, subfactions?: string[] }[]>} */
export function loadArmies() {
  return fetchList('/api/armies');
}

/** @returns {Promise<{ id: string, name: string, missionPack?: string }[]>} */
export function loadMissions() {
  return fetchList('/api/missions');
}

/** @returns {Promise<{ id: string, name: string, startDate?: string }[]>} */
export function loadEvents() {
  return fetchList('/api/events');
}

/** @returns {Promise<{ id: string, name: string, photo?: string, armies?: string[] }[]>} */
export function loadPlayers() {
  return fetchList('/api/players');
}

/** @returns {Promise<{ id: number, seasonYear: number, label: string }[]>} */
export function loadSeasons() {
  return fetchList('/api/seasons');
}

/** @param {number|string|null} seasonId */
export function loadDivisions(seasonId) {
  const parsed = Number.parseInt(String(seasonId || ''), 10);
  const query = Number.isNaN(parsed) ? '' : `?seasonId=${parsed}`;
  return fetchList(`/api/divisions${query}`);
}

/** @param {string} armyName @param {string} [ruleset] */
export function loadDetachments(armyName, ruleset = 'WH40K') {
  const params = new URLSearchParams();
  if (armyName) params.set('army', armyName);
  if (ruleset) params.set('ruleset', ruleset);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetchList(`/api/detachments${suffix}`);
}

/** @param {{ name: string }[]} armies */
export function armyNames(armies) {
  return armies.length ? armies.map((a) => a.name) : FALLBACK_ARMIES;
}

/**
 * @param {{ name: string, subfactions?: string[] }[]} armies
 * @param {string} factionName
 */
export function subfactionsFor(armies, factionName) {
  if (!factionName || factionName === '__custom__') return [];
  return armies.find((a) => a.name === factionName)?.subfactions ?? [];
}

/** @param {string} value comma-separated list */
export function splitList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
