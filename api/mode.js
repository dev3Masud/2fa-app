import { checkConfig } from './lib/users.js'
import { getUserByUsername } from './lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const cfg = checkConfig()
  if (!cfg.ok) {
    return res.status(200).json({ mode: 'misconfigured', message: cfg.message })
  }
  try {
    const user = await getUserByUsername(cfg.username)
    return res.status(200).json({
      mode: 'supabase',
      username: cfg.username,
      userExists: !!user,
    })
  } catch (e) {
    return res.status(200).json({ mode: 'supabase', username: cfg.username, userExists: false, error: e.message })
  }
}
