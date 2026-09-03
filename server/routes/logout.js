import { Router } from 'express'
import { buildClearCookie } from '../lib/auth.js'

const router = Router()

// ── M3 FIX: Only POST is accepted — prevents CSRF logout via GET (e.g. <img src="/api/logout">)
router.post('/', (req, res) => {
  res.setHeader('Set-Cookie', buildClearCookie())
  return res.status(200).json({ ok: true })
})

export default router
