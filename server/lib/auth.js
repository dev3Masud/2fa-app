import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = '2fa_session'
const CSRF_COOKIE_NAME = '2fa_csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'
const SESSION_TTL_SECONDS = 60 * 60 * 24 // 24 hours

// ── C1 FIX: Throw hard if SESSION_SECRET is not set ───────────────────────────
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET env var is required and must be at least 32 characters. ' +
        'Generate one with: openssl rand -hex 32'
    )
  }
  return secret
}

// ── H2 FIX: Use HKDF instead of raw SHA-256 as KDF ───────────────────────────
function getAesKey() {
  return crypto.hkdfSync('sha256', getSessionSecret(), 'session-vault-wrap', '', 32)
}

export function wrapVaultKeyForSession(vaultKey) {
  const aesKey = Buffer.from(getAesKey())
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv)
  const ct = Buffer.concat([cipher.update(vaultKey), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    v: iv.toString('base64'),
    c: ct.toString('base64'),
    t: tag.toString('base64'),
  }
}

export function unwrapVaultKeyFromSession(wrapped) {
  if (!wrapped) return null
  const aesKey = Buffer.from(getAesKey())
  try {
    const iv = Buffer.from(wrapped.v, 'base64')
    const ct = Buffer.from(wrapped.c, 'base64')
    const tag = Buffer.from(wrapped.t, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()])
  } catch {
    return null
  }
}

export function signSession({ userId, vaultKey }) {
  return jwt.sign(
    {
      uid: userId,
      vk: wrapVaultKeyForSession(vaultKey),
    },
    getSessionSecret(),
    { expiresIn: SESSION_TTL_SECONDS }
  )
}

export function verifySession(token) {
  try {
    return jwt.verify(token, getSessionSecret())
  } catch {
    return null
  }
}

// ── CSRF protection: Double-Submit Cookie pattern ────────────────────────────
// On login we set a CSRF cookie (readable by JS) and embed the same value in
// the session. The browser then must echo the value in a header on every
// state-changing request. Cookies are SameSite=Strict so cross-site requests
// won't include them, and the header is not auto-sent, blocking CSRF.
function generateCsrfToken() {
  return crypto.randomBytes(24).toString('base64url')
}

export function buildCookie(token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }
  return parts.join('; ')
}

export function buildCsrfCookie() {
  const token = generateCsrfToken()
  const parts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }
  return { token, header: token, cookie: parts.join('; ') }
}

export function buildClearCookie() {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ]
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }
  const csrfParts = [
    `${CSRF_COOKIE_NAME}=`,
    'Path=/',
    'SameSite=Strict',
    'Max-Age=0',
  ]
  if (process.env.NODE_ENV === 'production') {
    csrfParts.push('Secure')
  }
  return [parts.join('; '), csrfParts.join('; ')]
}

export function readCookieFromReq(req, name = COOKIE_NAME) {
  const raw = req.headers?.cookie || ''
  if (!raw) return null
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

// Constant-time string comparison
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export function getSession(req) {
  const token = readCookieFromReq(req, COOKIE_NAME)
  if (!token) return null
  return verifySession(token)
}

export function getVaultKeyFromReq(req) {
  const session = getSession(req)
  if (!session) return null
  return unwrapVaultKeyFromSession(session.vk)
}

export function getUserIdFromReq(req) {
  const session = getSession(req)
  return session?.uid || null
}

// ── Middleware: require a valid session and a matching CSRF token on
//    any state-changing request. Bypass for GET/HEAD/OPTIONS and for the
//    login route (no session yet) and for the /api/mode probe route.
export function requireSession(req, res, next) {
  const session = getSession(req)
  if (!session || !session.uid) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next()
  }
  const csrfCookie = readCookieFromReq(req, CSRF_COOKIE_NAME)
  const csrfHeader =
    req.headers[CSRF_HEADER_NAME] ||
    req.headers[CSRF_HEADER_NAME.toUpperCase()]
  if (!csrfCookie || !csrfHeader || !safeEqual(csrfCookie, csrfHeader)) {
    return res.status(403).json({ error: 'CSRF token missing or invalid' })
  }
  next()
}
