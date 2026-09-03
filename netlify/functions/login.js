import {
  ensureConfigOrError,
  bootstrapUser,
  authenticateAndUnlock,
} from './lib/users.js'
import {
  signSession,
  buildCookie,
  jsonResponse,
  errorResponse,
} from './lib/auth.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed')
  }
  const cfg = await ensureConfigOrError()
  if (cfg.error) return cfg.error

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return errorResponse(400, 'Invalid JSON')
  }
  const { username, password } = body
  if (!username || typeof username !== 'string') {
    return errorResponse(400, 'username is required')
  }
  if (!password || typeof password !== 'string') {
    return errorResponse(400, 'password is required')
  }
  if (username !== cfg.config.username) {
    await new Promise((r) => setTimeout(r, 250))
    return errorResponse(401, 'Invalid credentials')
  }

  try {
    let result
    // First try to find an existing user
    const { getUserByUsername } = await import('./lib/supabase.js')
    const existing = await getUserByUsername(username)
    if (!existing) {
      // Bootstrap: first login creates the user
      result = await bootstrapUser(username, password)
      if (result.error) return result.error
    } else {
      result = await authenticateAndUnlock(username, password)
      if (result.error) return result.error
    }
    const { user, vaultKey } = result
    const token = signSession({ userId: user.id, vaultKey })
    return jsonResponse(
      200,
      { ok: true, username: user.username },
      { 'Set-Cookie': buildCookie(token) }
    )
  } catch (err) {
    console.error('login error', err)
    return errorResponse(500, 'Login failed')
  }
}
