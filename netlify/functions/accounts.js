import { Secret } from 'otpauth'
import { encryptSecret } from './lib/crypto.js'
import {
  listAccountsByUser,
  getAccountById,
  createAccount,
  deleteAccountById,
  publicAccount,
  serializeAccount,
} from './lib/supabase.js'
import {
  getVaultKeyFromEvent,
  getUserIdFromEvent,
  jsonResponse,
  errorResponse,
} from './lib/auth.js'

function sanitizeInput(body) {
  const {
    label,
    issuer = '',
    secret,
    type = 'totp',
    digits = 6,
    period = 30,
    algorithm = 'SHA1',
    counter = 0,
  } = body || {}
  if (!label || typeof label !== 'string') {
    throw new Error('label is required')
  }
  if (!secret || typeof secret !== 'string') {
    throw new Error('secret is required')
  }
  const cleanSecret = secret.replace(/\s+/g, '').toUpperCase()
  try {
    Secret.fromBase32(cleanSecret.replace(/[^A-Z2-7=]/gi, ''))
  } catch {
    try {
      Secret.base32(cleanSecret)
    } catch {
      throw new Error('Invalid base32 secret')
    }
  }
  const t = type === 'hotp' ? 'hotp' : 'totp'
  const d = Number.isFinite(+digits) ? Math.min(8, Math.max(6, +digits)) : 6
  const p = Number.isFinite(+period) ? Math.min(60, Math.max(15, +period)) : 30
  const alg = ['SHA1', 'SHA256', 'SHA512'].includes(algorithm) ? algorithm : 'SHA1'
  const c = Number.isFinite(+counter) ? Math.max(0, +counter) : 0
  return {
    label: label.slice(0, 64),
    issuer: String(issuer).slice(0, 64),
    secret: cleanSecret,
    type: t,
    digits: d,
    period: p,
    algorithm: alg,
    counter: c,
  }
}

export async function handler(event) {
  const method = event.httpMethod
  const vaultKey = getVaultKeyFromEvent(event)
  const userId = getUserIdFromEvent(event)
  if (!vaultKey || !userId) return errorResponse(401, 'Unauthorized')

  if (method === 'GET') {
    const rows = await listAccountsByUser(userId)
    return jsonResponse(200, { accounts: rows.map(publicAccount) })
  }

  if (method === 'POST') {
    let body
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return errorResponse(400, 'Invalid JSON')
    }
    let input
    try {
      input = sanitizeInput(body)
    } catch (e) {
      return errorResponse(400, e.message)
    }
    const encrypted = encryptSecret(input.secret, vaultKey)
    const row = await createAccount(userId, {
      label: input.label,
      issuer: input.issuer,
      type: input.type,
      digits: input.digits,
      period: input.period,
      algorithm: input.algorithm,
      counter: input.counter,
      encryptedSecret: {
        ciphertext: encrypted.ciphertext.toString('base64'),
        iv: encrypted.iv.toString('base64'),
        authTag: encrypted.authTag.toString('base64'),
      },
    })
    return jsonResponse(201, { account: publicAccount(serializeAccount(row)) })
  }

  if (method === 'DELETE') {
    const qs = event.queryStringParameters || {}
    const id = qs.id
    if (!id) return errorResponse(400, 'id is required')
    const existing = await getAccountById(userId, id)
    if (!existing) return errorResponse(404, 'Not found')
    await deleteAccountById(userId, id)
    return jsonResponse(200, { ok: true })
  }

  return errorResponse(405, 'Method not allowed')
}
