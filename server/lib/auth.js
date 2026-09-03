import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = '2fa_session'
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
  return parts.join('; ')
}

export function readCookieFromReq(req) {
  const raw = req.headers?.cookie || ''
  if (!raw) return null
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === COOKIE_NAME) return rest.join('=')
  }
  return null
}

export function getSession(req) {
  const token = readCookieFromReq(req)
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
