import { TOTP, HOTP, Secret } from 'otpauth'
import { decryptSecret } from './lib/crypto.js'
import { getAccountById } from './lib/supabase.js'
import { getVaultKeyFromEvent, getUserIdFromEvent } from './lib/auth.js'

function generateCode(rec, vaultKey, counter) {
  const encBlob = {
    ciphertext: Buffer.from(rec.ciphertext, 'base64'),
    iv: Buffer.from(rec.iv, 'base64'),
    authTag: Buffer.from(rec.auth_tag, 'base64'),
  }
  const secretStr = decryptSecret(encBlob, vaultKey)
  const secret = Secret.fromBase32(secretStr)
  if (rec.type === 'hotp') {
    const hotp = new HOTP({
      secret,
      algorithm: rec.algorithm,
      digits: rec.digits,
      counter: counter ?? Number(rec.counter) ?? 0,
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const vaultKey = getVaultKeyFromEvent(req)
  const userId = getUserIdFromEvent(req)
  if (!vaultKey || !userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const id = req.query?.id
  if (!id) return res.status(400).json({ error: 'id is required' })
  try {
    const rec = await getAccountById(userId, id)
    if (!rec) return res.status(404).json({ error: 'Not found' })
    const counter = req.query?.counter != null ? Number(req.query.counter) : undefined
    const result = generateCode(rec, vaultKey, counter)
    return res.status(200).json({
      id,
      code: result.code,
      remaining: result.remaining,
      counter: result.counter,
      period: rec.period,
    })
  } catch (err) {
    console.error('totp error', err)
    return res.status(500).json({ error: 'Failed to generate code' })
  }
}
