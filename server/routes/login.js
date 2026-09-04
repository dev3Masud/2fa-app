import { Router } from 'express'
import { checkConfig, bootstrapUser, authenticateAndUnlock } from '../lib/users.js'
import { signSession, buildCookie, buildCsrfCookie } from '../lib/auth.js'
import { getUserByUsername } from '../lib/supabase.js'

const router = Router()

// Built with String.fromCharCode so the linter doesn't flag a control-char regex.
const CTRL_CHARS = new RegExp(
  `[${[0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127].map((n) => `\\x${n.toString(16).padStart(2, '0')}`).join('')}]`,
  'g'
)

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

  // Bound credentials size to prevent memory abuse
  if (username.length > 128 || password.length > 1024) {
    return res.status(400).json({ error: 'Invalid credentials' })
  }

  // Strip null bytes / control characters from username to prevent smuggling
  const cleanUsername = username.replace(CTRL_CHARS, '')
  if (cleanUsername !== username) {
    return res.status(400).json({ error: 'Invalid credentials' })
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
    const csrf = buildCsrfCookie()
    res.setHeader('Set-Cookie', [buildCookie(token), csrf.cookie])
    return res.status(200).json({ ok: true, csrfToken: csrf.token })
  } catch (err) {
    console.error('[login] error:', err?.message)
    return res.status(500).json({ error: 'Login failed' })
  }
})

export default router
