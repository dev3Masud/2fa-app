import { TOTP, HOTP, Secret } from 'otpauth'
import {
  getAccount,
} from './lib/store.js'
import {
  getVaultKeyFromEvent,
  jsonResponse,
  errorResponse,
} from './lib/auth.js'
import { decryptSecret, blobToEncrypted } from './lib/crypto.js'

function generateCode(rec, encryptedSecret, vaultKey, counter) {
  const secretStr = decryptSecret(encryptedSecret, vaultKey)
  const secret = Secret.fromBase32(secretStr)
  if (rec.type === 'hotp') {
    const hotp = new HOTP({
      secret,
      algorithm: rec.algorithm,
      digits: rec.digits,
      counter: counter ?? rec.counter ?? 0,
    })
    return { code: hotp.generate(), remaining: null, counter: hotp.counter }
  }
  const totp = new TOTP({
    secret,
    algorithm: rec.algorithm,
    digits: rec.digits,
    period: rec.period,
  })
  const now = Date.now()
  const remaining = totp.period - (Math.floor(now / 1000) % totp.period)
  return { code: totp.generate(), remaining, counter: null }
}

export async function handler(event) {
  const method = event.httpMethod
  if (method !== 'GET') return errorResponse(405, 'Method not allowed')
  const vaultKey = getVaultKeyFromEvent(event)
  if (!vaultKey) return errorResponse(401, 'Unauthorized')
  const qs = event.queryStringParameters || {}
  const id = qs.id
  if (!id) return errorResponse(400, 'id is required')
  const rec = await getAccount(id)
  if (!rec) return errorResponse(404, 'Not found')
  const counter = qs.counter != null ? Number(qs.counter) : undefined
  try {
    const result = generateCode(rec, blobToEncrypted(rec.encryptedSecret), vaultKey, counter)
    return jsonResponse(200, {
      id,
      code: result.code,
      remaining: result.remaining,
      counter: result.counter,
      period: rec.period,
    })
  } catch (err) {
    console.error('totp error', err)
    return errorResponse(500, 'Failed to generate code')
  }
}
