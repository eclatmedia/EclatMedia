const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const START_TIMEOUT_MS = 15000;

async function main() {
  const cleanupDeleteFixture = createDeleteFixture();
  const server = spawn(process.execPath, ['server.js'], {
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

    assertFlexiblePortfolioImageWorks(siteContent);
    await assertPortfolioDeleteWorks();
    await assertAdminLoginHandlesMissingProductionConfig();

    settled = true;
    console.log('Smoke test passed.');
  } finally {
    if (!serverExited) {
      server.kill('SIGTERM');
      await new Promise((resolve) => server.once('exit', resolve));
    }

    cleanupDeleteFixture();
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

async function assertPortfolioDeleteWorks() {
  const loginPage = await fetch(`${BASE_URL}/admin/login`, { redirect: 'manual' });
  if (!loginPage.ok) {
    fail(`Expected /admin/login to return 200, got ${loginPage.status}.`);
  }

  const loginPageCookies = readSetCookies(loginPage);
  const csrfToken = getCookieValue(loginPageCookies, 'eclat_admin_csrf');
  if (!csrfToken) {
    fail('Expected /admin/login to set a CSRF cookie.');
  }

  const loginResponse = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: serializeCookies(loginPageCookies)
    },
    body: new URLSearchParams({
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASSWORD || 'password',
      csrfToken
    })
  });

  if (loginResponse.status !== 302 || loginResponse.headers.get('location') !== '/admin') {
    fail(`Expected admin login to redirect to /admin, got ${loginResponse.status}.`);
  }

  const authenticatedCookies = [...loginPageCookies, ...readSetCookies(loginResponse)];
  const fixture = readDeleteFixture();
  const deleteResponse = await fetch(`${BASE_URL}/admin/portfolio/delete`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: serializeCookies(authenticatedCookies)
    },
    body: new URLSearchParams({
      id: fixture.id,
      csrfToken
    })
  });

  const location = deleteResponse.headers.get('location') || '';
  if (deleteResponse.status !== 302 || !location.includes('Portfolio+item+removed.')) {
    fail(`Expected portfolio delete to redirect with success, got ${deleteResponse.status}.`);
  }

  const metadata = JSON.parse(fs.readFileSync(fixture.metadataPath, 'utf8'));
  if (metadata.some((entry) => entry.id === fixture.id)) {
    fail('Expected deleted portfolio item to be removed from metadata.');
  }

  if (fs.existsSync(fixture.imagePath)) {
    fail('Expected deleted portfolio image file to be removed from disk.');
  }
}

async function assertAdminLoginHandlesMissingProductionConfig() {
  const port = 3101;
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      VERCEL: '1',
      AUTH_SECRET: '',
      SESSION_SECRET: '',
      ADMIN_USER: 'admin',
      ADMIN_PASSWORD: 'password'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverExited = false;
  let stdout = '';
  let stderr = '';

  server.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  server.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  server.on('exit', () => {
    serverExited = true;
  });

  try {
    const start = Date.now();
    while (Date.now() - start < START_TIMEOUT_MS) {
      try {
        const response = await fetch(`${baseUrl}/admin/login`, { redirect: 'manual' });
        if (response.status === 503) {
          const text = await response.text();
          if (
            !text.includes('AUTH_SECRET or SESSION_SECRET must be set in production.') ||
            !text.includes('ADMIN_USER and ADMIN_PASSWORD must be set in production.')
          ) {
            fail('Expected /admin/login to explain the missing production admin configuration.');
          }
          return;
        }
      } catch (error) {
        // Server is still starting.
      }

      await delay(250);
    }

    fail(`Timed out waiting for misconfigured admin login response.\n${stdout}${stderr}`);
  } finally {
    if (!serverExited) {
      server.kill('SIGTERM');
      await new Promise((resolve) => server.once('exit', resolve));
    }
  }
}

function assertFlexiblePortfolioImageWorks(siteContent) {
  const fixture = readDeleteFixture();
  const matchingImage = Array.isArray(siteContent.portfolio)
    ? siteContent.portfolio.find((item) => item && item.id === fixture.flexibleImageId)
    : null;

  if (!matchingImage) {
    fail('Expected /api/site-content to include the flexible portfolio image fixture.');
  }

  if (matchingImage.imageUrl !== fixture.flexibleImageUrl) {
    fail('Expected the flexible portfolio image URL to be preserved exactly.');
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDeleteFixture() {
  const metadataPath = path.join(process.cwd(), 'images', 'metadata.json');
  const metadataBackup = fs.readFileSync(metadataPath, 'utf8');
  const imagePath = path.join(process.cwd(), 'images', `smoke-delete-${Date.now()}.jpg`);
  const sourceImagePath = path.join(process.cwd(), 'images', 'photo1.jpg');
  const id = `asset-smoke-delete-${Date.now()}`;
  const flexibleImageId = `asset-smoke-flex-${Date.now()}`;
  const flexibleImageUrl = '/images/photo1.jpg?variant=portfolio#hero';
  const metadata = JSON.parse(metadataBackup);

  fs.copyFileSync(sourceImagePath, imagePath);
  metadata.push({
    id,
    filename: path.basename(imagePath),
    originalname: path.basename(imagePath),
    title: 'Smoke Delete',
    category: 'Other',
    order: metadata.length + 1,
    createdAt: new Date().toISOString()
  });
  metadata.push({
    id: flexibleImageId,
    imageUrl: flexibleImageUrl,
    originalname: 'photo1.jpg',
    title: 'Flexible Portfolio Image',
    category: 'Other',
    order: metadata.length + 2,
    createdAt: new Date().toISOString()
  });
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  const fixture = {
    id,
    flexibleImageId,
    flexibleImageUrl,
    imagePath,
    metadataPath,
    metadataBackup
  };

  process.env.SMOKE_DELETE_FIXTURE = JSON.stringify(fixture);

  return () => {
    fs.writeFileSync(metadataPath, metadataBackup, 'utf8');
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    delete process.env.SMOKE_DELETE_FIXTURE;
  };
}

function readDeleteFixture() {
  const raw = process.env.SMOKE_DELETE_FIXTURE;
  if (!raw) {
    fail('Delete fixture was not created.');
  }

  return JSON.parse(raw);
}

function readSetCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }

  const setCookie = response.headers.get('set-cookie');
  return setCookie ? [setCookie] : [];
}

function getCookieValue(cookieHeaders, name) {
  const prefix = `${name}=`;
  for (const header of cookieHeaders) {
    const cookie = header.split(';', 1)[0];
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }

  return '';
}

function serializeCookies(cookieHeaders) {
  return cookieHeaders.map((header) => header.split(';', 1)[0]).join('; ');
}

function fail(message) {
  throw new Error(message);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
