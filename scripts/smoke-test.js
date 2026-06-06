const { spawn } = require('child_process');

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const START_TIMEOUT_MS = 15000;

async function main() {
  const server = spawn(process.execPath, ['admin-upload.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let settled = false;
  let serverExited = false;
  let stdout = '';
  let stderr = '';

  server.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  server.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  server.on('exit', (code) => {
    serverExited = true;
    if (!settled) {
      fail(`Server exited before tests completed (code ${code}).\n${stdout}${stderr}`);
    }
  });

  try {
    await waitForServer();

    await assertOk('/');
    await assertOk('/gallery');
    const siteContent = await assertJson('/api/site-content');

    if (!Array.isArray(siteContent.process) || siteContent.process.length < 4) {
      fail('Expected /api/site-content to include at least 4 process steps.');
    }

    settled = true;
    console.log('Smoke test passed.');
  } finally {
    if (!serverExited) {
      server.kill('SIGTERM');
      await new Promise((resolve) => server.once('exit', resolve));
    }
  }

  async function waitForServer() {
    const start = Date.now();
    while (Date.now() - start < START_TIMEOUT_MS) {
      try {
        const response = await fetch(`${BASE_URL}/`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server is still starting.
      }

      await delay(250);
    }

    fail(`Timed out waiting for server to start.\n${stdout}${stderr}`);
  }
}

async function assertOk(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`);
  if (!response.ok) {
    fail(`Expected ${pathname} to return 200, got ${response.status}.`);
  }
}

async function assertJson(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`);
  if (!response.ok) {
    fail(`Expected ${pathname} to return 200, got ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    fail(`Expected ${pathname} to return JSON, got "${contentType}".`);
  }

  return response.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  throw new Error(message);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
