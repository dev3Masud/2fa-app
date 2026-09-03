import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.getMode()
      .then((res) => {
        if (cancelled) return
        setMode(res)
      })
      .catch(() => {
        if (!cancelled) setMode({ mode: 'unknown' })
      })
    return () => { cancelled = true }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await api.login(username, password)
      window.location.reload()
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const hint = !mode
    ? 'Loading…'
    : mode.mode === 'misconfigured'
      ? 'Server is misconfigured — check environment variables.'
      : mode.hasAccount
        ? 'Sign in to your vault.'
        : 'First time? Sign in to create your vault.'

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1>2FA Vault</h1>
        <p className="info" style={{ marginTop: 0 }}>
          {hint}
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label className="label">Username</label>
            <input
              className="input"
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <div className="error">{err}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
        <p className="info">
          Forgot the password? All stored 2FA secrets are lost &mdash; that&apos;s the trade-off for zero-knowledge storage.
        </p>
      </div>
    </div>
  )
}
