import { Router } from 'express'
import { Secret } from 'otpauth'
import { encryptSecret } from '../lib/crypto.js'
import {
  listAccountsByUser,
  getAccountById,
  createAccount,
  deleteAccountById,
  publicAccount,
  serializeAccount,
} from '../lib/supabase.js'
import { getVaultKeyFromReq, getUserIdFromReq } from '../lib/auth.js'

// ── L3 FIX: UUID format validation to prevent malformed IDs reaching DB ───────
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const router = Router()

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
  if (!label || typeof label !== 'string') throw new Error('label is required')
  if (!secret || typeof secret !== 'string') throw new Error('secret is required')
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

// GET /api/accounts — list all accounts for the authenticated user
router.get('/', async (req, res) => {
  const vaultKey = getVaultKeyFromReq(req)
  const userId = getUserIdFromReq(req)
  if (!vaultKey || !userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const rows = await listAccountsByUser(userId)
    return res.status(200).json({ accounts: rows.map(publicAccount) })
  } catch (err) {
    console.error('[accounts] list error:', err?.message)
    return res.status(500).json({ error: 'Failed to list accounts' })
  }
})

// POST /api/accounts — create a new encrypted account
router.post('/', async (req, res) => {
  const vaultKey = getVaultKeyFromReq(req)
  const userId = getUserIdFromReq(req)
  if (!vaultKey || !userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  let input
  try {
    input = sanitizeInput(req.body)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  try {
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
    return res.status(201).json({ account: publicAccount(serializeAccount(row)) })
  } catch (err) {
    console.error('[accounts] create error:', err?.message)
    return res.status(500).json({ error: 'Failed to create account' })
  }
})

// DELETE /api/accounts/:id — delete an account by ID
router.delete('/:id', async (req, res) => {
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
  try {
    const existing = await getAccountById(userId, id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    await deleteAccountById(userId, id)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[accounts] delete error:', err?.message)
    return res.status(500).json({ error: 'Failed to delete account' })
  }
})

export default router
