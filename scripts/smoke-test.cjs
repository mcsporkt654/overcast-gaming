const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function assertExists(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing ${relPath}`);
    return;
  }
  ok(`Found ${relPath}`);
}

function assertMissing(relPath) {
  const fullPath = path.join(root, relPath);
  if (fs.existsSync(fullPath)) {
    fail(`${relPath} should not exist (ported to a Svelte route / removed feature)`);
    return;
  }
  ok(`Confirmed absent: ${relPath}`);
}

function assertValidJSON(relPath) {
  const fullPath = path.join(root, relPath);
  try {
    JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    ok(`Valid JSON ${relPath}`);
  } catch (error) {
    fail(`Invalid JSON ${relPath}: ${error.message}`);
  }
}

function assertContains(relPath, needle) {
  const fullPath = path.join(root, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content.includes(needle)) {
    fail(`${relPath} is missing expected content: ${needle}`);
    return;
  }
  ok(`${relPath} contains expected content`);
}

// Pages still served as static HTML (not yet ported to SvelteKit routes)
const staticHtmlFiles = ['static/matchups.html', 'static/meta.html'];

assertExists('src/hooks.server.js');
assertExists('src/lib/db.js');
// style.css and nav.js exist only for the two remaining static pages above;
// SvelteKit routes are styled by src/lib/styles/overcast.css.
assertExists('static/style.css');
assertExists('static/nav.js');
assertExists('src/lib/styles/overcast.css');
assertExists('data/posts.json');
assertExists('data/armies.json');
assertExists('data/missions.json');

assertValidJSON('data/posts.json');
assertValidJSON('data/armies.json');
assertValidJSON('data/missions.json');

// The roster and match history are entered through the admin console — they are
// deliberately no longer seeded from flat files.
assertMissing('data/players.json');
assertMissing('data/matches.json');

staticHtmlFiles.forEach(file => assertContains(file, '<script src="nav.js" defer></script>'));

// The real dispatches moved out of static/news-data.js and into the database
// seed, so /community and /news/[slug] can render them server-side.
assertMissing('static/news-data.js');
assertContains('data/posts.json', 'owl-round-4-final-round');

staticHtmlFiles.forEach(file => {
  if (fs.readFileSync(path.join(root, file), 'utf8').includes('href="/gallery"')) {
    fail(`${file} still links to the removed /gallery page`);
  }
});

// Home / Roster / Stats are now SvelteKit routes, not static HTML
assertMissing('static/index.html');
assertMissing('static/roster.html');
assertMissing('static/stats.html');
assertMissing('static/gallery.html');
assertMissing('static/admin.html');

// Ported in the Modernist × Nocturne redesign — deleting each static twin is
// what activates the SvelteKit route at the same path.
assertMissing('static/feed.html');
assertMissing('static/news.html');
assertMissing('static/owl.html');
assertMissing('static/player.html');
assertMissing('static/match-detail.html');

assertExists('src/routes/+page.svelte');
assertExists('src/routes/roster/+page.svelte');
assertExists('src/routes/stats/+page.svelte');
assertExists('src/routes/admin/+layout.svelte');
assertExists('src/routes/admin/+layout.server.js');
assertExists('src/routes/admin/+page.svelte');
assertExists('src/routes/admin/roster/+page.svelte');
assertExists('src/routes/admin/match/+page.svelte');
assertExists('src/lib/components/Header.svelte');
assertExists('src/lib/components/Footer.svelte');
assertExists('src/routes/community/+page.svelte');
assertExists('src/routes/news/[slug]/+page.svelte');
assertExists('src/routes/players/[id]/+page.svelte');
assertExists('src/routes/matches/[id]/+page.svelte');
assertExists('src/routes/+error.svelte');

// Redirects keeping the retired URLs alive
assertExists('src/routes/owl/+server.js');
assertExists('src/routes/feed/+server.js');
assertExists('src/routes/news/+server.js');
assertExists('src/routes/player/+server.js');
assertExists('src/routes/match-detail/+server.js');

// The pages render server-side from load data now; the extracted vanilla-JS
// renderers they replaced are gone.
assertMissing('static/home-page.js');
assertMissing('static/roster-page.js');
assertMissing('static/stats-page.js');

// Dev-only design-verification harness must not ship.
assertMissing('src/routes/__preview');
assertMissing('static/__frame');

assertContains('src/lib/components/Header.svelte', 'Home');
if (fs.readFileSync(path.join(root, 'src/lib/components/Header.svelte'), 'utf8').includes('Gallery')) {
  fail('Header.svelte still references the removed Gallery nav item');
}

if (process.exitCode) {
  console.error('Smoke test failed.');
} else {
  console.log('Smoke test passed.');
}
