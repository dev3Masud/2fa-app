import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

import loginRouter from './routes/login.js'
import logoutRouter from './routes/logout.js'
import accountsRouter from './routes/accounts.js'
import totpRouter from './routes/totp.js'
import qrParseRouter from './routes/qr-parse.js'
import modeRouter from './routes/mode.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')
const PORT = parseInt(process.env.PORT || '3001', 10)
const isDev = process.env.NODE_ENV !== 'production'

const app = express()

// ── M5 FIX: Helmet — sets secure HTTP headers on every response ───────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // needed for Vite's injected styles
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https://*.supabase.co'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // allow Vite HMR in dev
  })
)

// ── M5 FIX: Additional headers not covered by Helmet defaults ─────────────────
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

// ── Body parsers ─────────────────────────────────────────────────────────────
// M1 FIX: 2MB body limit prevents large payload DoS
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: false, limit: '2mb' }))

// ── H1 FIX: Rate limiting on the login endpoint ───────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // only count failed attempts
})

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/login', loginLimiter, loginRouter)
app.use('/api/logout', logoutRouter)
app.use('/api/accounts', accountsRouter)
app.use('/api/totp', totpRouter)
app.use('/api/qr-parse', qrParseRouter)
app.use('/api/mode', modeRouter)

// 404 for unknown /api/* routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Static file serving (production) ─────────────────────────────────────────
if (!isDev) {
  if (existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR))
    // SPA fallback — serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(join(DIST_DIR, 'index.html'))
    })
  } else {
    console.warn(
      '[server] dist/ not found. Run `npm run build` before starting in production.'
    )
  }
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[server] unhandled error:', err?.message)
  res.status(500).json({ error: 'Internal server error' })
})

// Only start the listener when run directly. On serverless platforms
// (Vercel, AWS Lambda), importing this module just exports the app.
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
if (!isServerless) {
  app.listen(PORT, () => {
    console.log(`✅ 2FA Vault API running on http://localhost:${PORT}`)
    if (isDev) {
      console.log('   Mode: development (no static files — use Vite on :3000)')
    } else {
      console.log(`   Mode: production (serving dist/ on port ${PORT})`)
    }
  })
}

export default app
