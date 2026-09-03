import { jsonResponse, errorResponse } from './lib/auth.js'
import { checkConfig } from './lib/users.js'
import { getUserByUsername } from './lib/supabase.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed')
  }
  const cfg = checkConfig()
  if (!cfg.ok) {
    return jsonResponse(200, { mode: 'misconfigured', message: cfg.message })
  }
  try {
    const user = await getUserByUsername(cfg.username)
    return jsonResponse(200, {
      mode: 'supabase',
      username: cfg.username,
      userExists: !!user,
    })
  } catch (e) {
    return jsonResponse(200, { mode: 'supabase', username: cfg.username, userExists: false, error: e.message })
  }
}
