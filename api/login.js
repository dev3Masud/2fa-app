import {
  ensureConfigOrError,
  bootstrapUser,
  authenticateAndUnlock,
} from './lib/users.js'
import { signSession, buildCookie } from './lib/auth.js'

function getBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const cfg = await ensureConfigOrError()
  if (cfg.error) {
    const { statusCode, body } = cfg.error
    return res.status(statusCode).json(JSON.parse(body))
  }

  const { username, password } = getBody(req)
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username is required' })
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'password is required' })
  }
  if (username !== cfg.config.username) {
    await new Promise((r) => setTimeout(r, 250))
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  try {
    let result
    const { getUserByUsername } = await import('./lib/supabase.js')
    const existing = await getUserByUsername(username)
    if (!existing) {
      result = await bootstrapUser(username, password)
      if (result.error) {
        const { statusCode, body } = result.error
        return res.status(statusCode).json(JSON.parse(body))
      }
    } else {
      result = await authenticateAndUnlock(username, password)
      if (result.error) {
        const { statusCode, body } = result.error
        return res.status(statusCode).json(JSON.parse(body))
      }
    }
    const { user, vaultKey } = result
    const token = signSession({ userId: user.id, vaultKey })
    res.setHeader('Set-Cookie', buildCookie(token))
    return res.status(200).json({ ok: true, username: user.username })
  } catch (err) {
    console.error('login error', err)
    return res.status(500).json({ error: 'Login failed' })
  }
}
