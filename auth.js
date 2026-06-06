const crypto = require('crypto');

const SESSION_COOKIE = 'eclat_admin_session';
const CSRF_COOKIE = 'eclat_admin_csrf';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const CSRF_TTL_SECONDS = 60 * 60 * 12;
const DEFAULT_AUTH_SECRET = 'change-this-session-secret';
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || DEFAULT_AUTH_SECRET;
const SECURE_COOKIES = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

if (SECURE_COOKIES && AUTH_SECRET === DEFAULT_AUTH_SECRET) {
  throw new Error('AUTH_SECRET or SESSION_SECRET must be set in production.');
}

function authMiddleware(req, res, next) {
  const cookies = parseCookies(req.headers.cookie || '');
  const session = verifyToken(cookies[SESSION_COOKIE], 'admin-session');
  let csrfToken = cookies[CSRF_COOKIE];

  if (!verifyToken(csrfToken, 'csrf')) {
    csrfToken = signToken({
      type: 'csrf',
      nonce: crypto.randomBytes(18).toString('hex'),
      exp: Date.now() + CSRF_TTL_SECONDS * 1000
    });
    setCookie(res, CSRF_COOKIE, csrfToken, {
      httpOnly: true,
      maxAge: CSRF_TTL_SECONDS
    });
  }

  req.auth = {
    isAdmin: Boolean(session)
  };
  req.csrfToken = csrfToken;
  res.locals.csrfToken = csrfToken;
  next();
}

function startAdminSession(res) {
  setCookie(
    res,
    SESSION_COOKIE,
    signToken({
      type: 'admin-session',
      sub: 'admin',
      exp: Date.now() + SESSION_TTL_SECONDS * 1000
    }),
    {
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS
    }
  );
}

function clearAdminSession(res) {
  clearCookie(res, SESSION_COOKIE);
}

function isValidCsrfRequest(req) {
  const submittedToken =
    (req.body && typeof req.body.csrfToken === 'string' && req.body.csrfToken) ||
    (typeof req.query.csrfToken === 'string' && req.query.csrfToken) ||
    (typeof req.get('x-csrf-token') === 'string' && req.get('x-csrf-token')) ||
    '';

  if (!submittedToken || !req.csrfToken) {
    return false;
  }

  return safeEqual(submittedToken, req.csrfToken) && Boolean(verifyToken(submittedToken, 'csrf'));
}

function signToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token, expectedType) {
  if (typeof token !== 'string') {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  if (!safeEqual(signature, createSignature(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if (payload.type !== expectedType) {
      return null;
    }

    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function createSignature(value) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(value).digest('base64url');
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(';').reduce((cookies, entry) => {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex < 0) {
      return cookies;
    }

    const name = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!name) {
      return cookies;
    }

    try {
      cookies[name] = decodeURIComponent(value);
    } catch (error) {
      cookies[name] = value;
    }

    return cookies;
  }, {});
}

function setCookie(res, name, value, { httpOnly, maxAge }) {
  appendSetCookie(
    res,
    serializeCookie(name, value, {
      path: '/',
      httpOnly,
      sameSite: 'Lax',
      secure: SECURE_COOKIES,
      maxAge
    })
  );
}

function clearCookie(res, name) {
  appendSetCookie(
    res,
    serializeCookie(name, '', {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: SECURE_COOKIES,
      maxAge: 0,
      expires: new Date(0)
    })
  );
}

function appendSetCookie(res, value) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', [value]);
    return;
  }

  const values = Array.isArray(existing) ? existing : [String(existing)];
  res.setHeader('Set-Cookie', [...values, value]);
}

function serializeCookie(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge >= 0) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }

  if (options.expires instanceof Date) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  parts.push(`Path=${options.path || '/'}`);
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  authMiddleware,
  clearAdminSession,
  isValidCsrfRequest,
  startAdminSession
};
