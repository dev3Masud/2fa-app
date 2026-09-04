import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'

// Tests for the rate limiter and CSRF middleware don't require a full app
// instance — we just verify the auth module's CSRF cookie helpers behave
// correctly and the requireSession middleware rejects bad requests.

const originalSecret = process.env.SESSION_SECRET
process.env.SESSION_SECRET = 'a'.repeat(64)
process.env.NODE_ENV = 'production'

const { requireSession, buildCsrfCookie } = await import('../server/lib/auth.js')

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

after(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = originalSecret
})
