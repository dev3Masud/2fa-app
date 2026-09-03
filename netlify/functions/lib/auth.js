import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = '2fa_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24

function getSessionSecret() {
  return process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me'
}

function getVaultKeySecret() {
  return crypto
    .createHash('sha256')
    .update(getSessionSecret() + ':vault-key-wrap')
    .digest()
}

function getAesKey() {
  return crypto.createHash('sha256').update(getSessionSecret()).digest()
}

export function wrapVaultKeyForSession(vaultKey) {
  const aesKey = getAesKey()
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
  const aesKey = getAesKey()
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

export function signSession(vaultKeyB64) {
  return jwt.sign({ vk: vaultKeyB64 }, getSessionSecret(), {
    expiresIn: SESSION_TTL_SECONDS,
  })
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
  if (process.env.NETLIFY || process.env.NODE_ENV === 'production') {
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
  if (process.env.NETLIFY || process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }
  return parts.join('; ')
}

export function readCookie(event) {
  const headers = event.headers || {}
  const raw = headers.cookie || headers.Cookie || ''
  if (!raw) return null
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === COOKIE_NAME) return rest.join('=')
  }
  return null
}

export function getSession(event) {
  const token = readCookie(event)
  if (!token) return null
  return verifySession(token)
}

export function getVaultKeyFromEvent(event) {
  const session = getSession(event)
  if (!session) return null
  return unwrapVaultKeyFromSession(session.vk)
}

export function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  }
}

export function errorResponse(statusCode, message) {
  return jsonResponse(statusCode, { error: message })
}
