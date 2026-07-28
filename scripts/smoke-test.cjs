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
const staticHtmlFiles = [
  'static/feed.html',
  'static/news.html',
  'static/owl.html',
  'static/matchups.html',
  'static/meta.html',
  'static/player.html',
  'static/match-detail.html'
];

assertExists('src/hooks.server.js');
assertExists('src/lib/db.js');
assertExists('static/style.css');
assertExists('static/nav.js');
assertExists('static/news-data.js');
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
assertContains('static/feed.html', '<script src="news-data.js" defer></script>');
assertContains('static/news.html', '<script src="news-data.js" defer></script>');

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
assertExists('static/home-page.js');
assertExists('static/roster-page.js');
assertExists('static/stats-page.js');

assertContains('src/lib/components/Header.svelte', 'Home');
if (fs.readFileSync(path.join(root, 'src/lib/components/Header.svelte'), 'utf8').includes('Gallery')) {
  fail('Header.svelte still references the removed Gallery nav item');
}

if (process.exitCode) {
  console.error('Smoke test failed.');
} else {
  console.log('Smoke test passed.');
}
