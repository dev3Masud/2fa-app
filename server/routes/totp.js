import { Router } from 'express'
import { TOTP, HOTP, Secret } from 'otpauth'
import { decryptSecret } from '../lib/crypto.js'
import { getAccountById } from '../lib/supabase.js'
import { getVaultKeyFromReq, getUserIdFromReq } from '../lib/auth.js'

// ── L3 FIX: UUID format validation ───────────────────────────────────────────
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const router = Router()

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

// GET /api/totp/:id
router.get('/:id', async (req, res) => {
  const vaultKey = getVaultKeyFromReq(req)
  const userId = getUserIdFromReq(req)
  if (!vaultKey || !userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { id } = req.params
  // L3 FIX: Validate UUID format
  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid account id' })
  }
  const rawCounter = req.query.counter
  const counter =
    rawCounter != null && rawCounter !== '' ? Number(rawCounter) : undefined

  try {
    const rec = await getAccountById(userId, id)
    if (!rec) return res.status(404).json({ error: 'Not found' })
    const result = generateCode(rec, vaultKey, counter)
    return res.status(200).json({
      id,
      code: result.code,
      remaining: result.remaining,
      counter: result.counter,
      period: rec.period,
    })
  } catch (err) {
    console.error('[totp] error:', err?.message)
    return res.status(500).json({ error: 'Failed to generate code' })
  }
})

export default router
