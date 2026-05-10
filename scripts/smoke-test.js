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

const htmlFiles = [
  'public/index.html',
  'public/feed.html',
  'public/news.html',
  'public/gallery.html',
  'public/owl.html',
  'public/roster.html',
  'public/stats.html',
  'public/admin.html'
];

assertExists('server.js');
assertExists('public/style.css');
assertExists('public/nav.js');
assertExists('public/news-data.js');
assertExists('data/players.json');
assertExists('data/matches.json');
assertExists('data/posts.json');

assertValidJSON('data/players.json');
assertValidJSON('data/matches.json');
assertValidJSON('data/posts.json');

htmlFiles.forEach(file => assertContains(file, '<script src="nav.js" defer></script>'));
assertContains('public/feed.html', '<script src="news-data.js" defer></script>');
assertContains('public/news.html', '<script src="news-data.js" defer></script>');
assertContains('public/index.html', '<script src="news-data.js" defer></script>');

if (process.exitCode) {
  console.error('Smoke test failed.');
} else {
  console.log('Smoke test passed.');
}
