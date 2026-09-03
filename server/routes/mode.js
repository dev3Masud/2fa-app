import { Router } from 'express'
import { checkConfig } from '../lib/users.js'
import { getUserByUsername } from '../lib/supabase.js'

const router = Router()

// ── M2 FIX: No longer exposes admin username or userExists to unauthenticated callers ──
router.get('/', async (req, res) => {
  const cfg = checkConfig()
  if (!cfg.ok) {
    // Only reveal that the server is misconfigured — not why
    return res.status(200).json({ mode: 'misconfigured' })
  }
  try {
    const user = await getUserByUsername(cfg.username)
    return res.status(200).json({
      mode: 'ready',
      hasAccount: !!user,
    })
  } catch {
    return res.status(200).json({ mode: 'ready', hasAccount: false })
  }
})

export default router
