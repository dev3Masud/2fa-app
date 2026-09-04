import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'

// Tests for the rate limiter and CSRF middleware don't require a full app
// instance — we just verify the auth module's CSRF cookie helpers behave
// correctly and the requireSession middleware rejects bad requests.

const originalSecret = process.env.SESSION_SECRET
const originalNodeEnv = process.env.NODE_ENV
const originalVercel = process.env.VERCEL
process.env.SESSION_SECRET = 'a'.repeat(64)
process.env.NODE_ENV = 'production'

const { requireSession, buildCsrfCookie, buildCookie, buildClearCookie } =
  await import('../server/lib/auth.js')

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
  }
  return res
}

function makeReq({ method = 'GET', cookies = '', headers = {} } = {}) {
  return { method, headers: { ...headers, cookie: cookies } }
}

describe('requireSession middleware', () => {
  test('rejects request with no session cookie', () => {
    let called = false
    const req = makeReq({ method: 'POST' })
    const res = makeRes()
    requireSession(req, res, () => { called = true })
    assert.equal(called, false)
    assert.equal(res.statusCode, 401)
  })

  test('rejects POST with valid session but missing CSRF', () => {
    // Forge a valid session via signSession, by piggy-backing on requireSession
    // (we just want to ensure CSRF is enforced on writes). Easiest way: import
    // signSession dynamically. To keep this test independent, we use a
    // simple module import:
    let called = false
    // Build a fake JWT — invalid signature means verifySession returns null,
    // so we'll fall through to "no session" path. Add a separate path by
    // importing signSession:
    return import('../server/lib/auth.js').then(({ signSession }) => {
      const token = signSession({ userId: 'test-uid', vaultKey: Buffer.alloc(32) })
      const req = makeReq({ method: 'POST', cookies: `2fa_session=${token}` })
      const res = makeRes()
      requireSession(req, res, () => { called = true })
      assert.equal(called, false)
      assert.equal(res.statusCode, 403)
    })
  })

  test('allows GET with valid session (no CSRF needed)', async () => {
    const { signSession } = await import('../server/lib/auth.js')
    const token = signSession({ userId: 'test-uid', vaultKey: Buffer.alloc(32) })
    let called = false
    const req = makeReq({ method: 'GET', cookies: `2fa_session=${token}` })
    const res = makeRes()
    requireSession(req, res, () => { called = true })
    assert.equal(called, true)
  })

  test('allows POST with valid session AND matching CSRF', async () => {
    const { signSession } = await import('../server/lib/auth.js')
    const token = signSession({ userId: 'test-uid', vaultKey: Buffer.alloc(32) })
    const csrf = buildCsrfCookie()
    let called = false
    const req = makeReq({
      method: 'POST',
      cookies: `2fa_session=${token}; 2fa_csrf=${csrf.token}`,
      headers: { 'x-csrf-token': csrf.token },
    })
    const res = makeRes()
    requireSession(req, res, () => { called = true })
    assert.equal(called, true)
  })
})

describe('CSRF cookie helpers', () => {
  test('CSRF cookie uses SameSite=Lax and Secure in production', () => {
    const { cookie } = buildCsrfCookie()
    assert.ok(cookie.includes('SameSite=Lax'), `expected SameSite=Lax in: ${cookie}`)
    assert.ok(cookie.includes('Secure'), `expected Secure in: ${cookie}`)
    assert.ok(!cookie.includes('HttpOnly'), `CSRF cookie must NOT be HttpOnly`)
  })

  test('CSRF cookie uses SameSite=Lax and Secure when VERCEL=1 (no NODE_ENV)', () => {
    const saved = process.env.NODE_ENV
    delete process.env.NODE_ENV
    process.env.VERCEL = '1'
    return import('../server/lib/auth.js?vercel=1').then((mod) => {
      const { cookie } = mod.buildCsrfCookie()
      assert.ok(cookie.includes('SameSite=Lax'), `expected SameSite=Lax in: ${cookie}`)
      assert.ok(cookie.includes('Secure'), `expected Secure in: ${cookie}`)
      if (saved === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = saved
      delete process.env.VERCEL
    })
  })

  test('Session cookie is HttpOnly + SameSite=Strict + Secure', () => {
    const cookie = buildCookie('dummy')
    assert.ok(cookie.includes('HttpOnly'))
    assert.ok(cookie.includes('SameSite=Strict'))
    assert.ok(cookie.includes('Secure'))
  })

  test('Clear cookies return both session and CSRF cookie strings', () => {
    const cleared = buildClearCookie()
    assert.ok(Array.isArray(cleared))
    assert.equal(cleared.length, 2)
    assert.ok(cleared[0].startsWith('2fa_session='))
    assert.ok(cleared[1].startsWith('2fa_csrf='))
  })
})

after(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = originalSecret
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
  if (originalVercel === undefined) delete process.env.VERCEL
  else process.env.VERCEL = originalVercel
})
