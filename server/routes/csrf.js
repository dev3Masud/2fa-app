import { Router } from 'express'
import { buildCsrfCookie } from '../lib/auth.js'

const router = Router()

// Issues (or re-issues) the CSRF token. Requires a valid session.
// The token is returned in the JSON body AND set as a non-HttpOnly
// cookie so the browser can echo it back in the X-CSRF-Token header.
//
// This endpoint exists so the client can recover transparently when
// its JS-readable CSRF cookie was lost (e.g. cookie cleared, browser
// stripped it due to privacy settings, or SameSite=Strict quirks on
// certain embedded / preview-URL scenarios on Vercel). The client
// retries the original failed request after fetching a fresh token.
router.get('/', (req, res) => {
  const csrf = buildCsrfCookie()
  res.setHeader('Set-Cookie', csrf.cookie)
  return res.status(200).json({ csrfToken: csrf.token })
})

export default router