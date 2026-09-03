import { Router } from 'express'
import { checkConfig, bootstrapUser, authenticateAndUnlock } from '../lib/users.js'
import { signSession, buildCookie } from '../lib/auth.js'
import { getUserByUsername } from '../lib/supabase.js'

const router = Router()

// ── H1 FIX: Rate limiting is applied globally in server/index.js on /api/login

router.post('/', async (req, res) => {
  const cfg = checkConfig()
  if (!cfg.ok) {
    return res.status(500).json({ error: cfg.message })
  }

  const { username, password } = req.body || {}

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username is required' })
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'password is required' })
  }

  // Constant-time username check — always wait the same amount before rejection
  if (username !== cfg.username) {
    await new Promise((r) => setTimeout(r, 400))
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  try {
    const existing = await getUserByUsername(username)
    let result
    if (!existing) {
      result = await bootstrapUser(username, password)
    } else {
      result = await authenticateAndUnlock(username, password)
    }

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message })
    }

    const { user, vaultKey } = result
    const token = signSession({ userId: user.id, vaultKey })
    res.setHeader('Set-Cookie', buildCookie(token))
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[login] error:', err?.message)
    return res.status(500).json({ error: 'Login failed' })
  }
})

export default router
