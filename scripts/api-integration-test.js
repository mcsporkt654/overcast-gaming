const { spawn } = require('child_process');
const path = require('path');

const PORT = 4567;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServerReady(maxMs = 7000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/stats`);
      if (res.ok) return;
    } catch (_) {
      // Ignore until server is ready.
    }
    await wait(120);
  }
  throw new Error('Server did not become ready in time.');
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }
  return { status: res.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(PORT),
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'test-admin-password'
    },
    stdio: 'pipe'
  });

  const serverLogs = [];
  serverProcess.stdout.on('data', data => serverLogs.push(data.toString()));
  serverProcess.stderr.on('data', data => serverLogs.push(data.toString()));

  try {
    await waitForServerReady();

    const unauthorized = await requestJson(`${BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', armies: ['Necrons'] })
    });
    assert(unauthorized.status === 401, 'POST /api/players should require admin auth');

    const badLogin = await requestJson(`${BASE_URL}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password' })
    });
    assert(badLogin.status === 401, 'Invalid admin password should return 401');

    const goodLogin = await requestJson(`${BASE_URL}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'test-admin-password' })
    });
    assert(goodLogin.status === 200 && goodLogin.body && goodLogin.body.token, 'Valid admin login should return token');

    const token = goodLogin.body.token;

    const badMatch = await requestJson(`${BASE_URL}/api/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({
        date: '2026-05-10',
        playerId: 'player-1',
        armyUsed: 'Necrons',
        opponentName: 'Opponent',
        opponentArmy: 'Aeldari',
        result: 'INVALID',
        pointsDiff: 10
      })
    });
    assert(badMatch.status === 400, 'Invalid result should return 400');

    const badDateMatch = await requestJson(`${BASE_URL}/api/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({
        date: '05/10/2026',
        playerId: 'player-1',
        armyUsed: 'Necrons',
        opponentName: 'Opponent',
        opponentArmy: 'Aeldari',
        result: 'W',
        pointsDiff: 10
      })
    });
    assert(badDateMatch.status === 400, 'Invalid date format should return 400');

    const logout = await requestJson(`${BASE_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { 'x-admin-token': token }
    });
    assert(logout.status === 200, 'Admin logout should succeed');

    const postLogoutAction = await requestJson(`${BASE_URL}/api/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ name: 'PostLogout', armies: ['Orks'] })
    });
    assert(postLogoutAction.status === 401, 'Invalidated token should not authorize writes');

    console.log('API integration test passed.');
  } finally {
    serverProcess.kill('SIGTERM');
    await wait(120);
    if (!serverProcess.killed) {
      serverProcess.kill('SIGKILL');
    }
  }
}

run().catch(error => {
  console.error('API integration test failed:', error.message);
  process.exit(1);
});
