import { Router } from 'express'
import { checkConfig } from '../lib/users.js'

const router = Router()

// ── M2 FIX: No longer reveals admin username or userExists to unauthenticated callers ──
// Always return the same response shape to prevent timing/structure fingerprinting.
router.get('/', async (req, res) => {
  const cfg = checkConfig()
  if (!cfg.ok) {
    return res.status(200).json({ mode: 'ready' })
  }
  // Server is configured. We deliberately do not reveal whether a user row
  // has been created — that information is not required for the client and
  // would allow attackers to enumerate state. The login endpoint will create
  // the user on first successful sign-in.
  return res.status(200).json({ mode: 'ready' })
})

export default router
