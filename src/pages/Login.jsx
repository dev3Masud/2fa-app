import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'

export default function Login() {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState(null)

  useEffect(() => {
    api.getMode().then(setMode).catch(() => setMode({ mode: 'auto' }))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await api.login(password)
      window.location.reload()
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const isEnv = mode?.mode === 'env'
  const hint = !mode
    ? 'Loading…'
    : isEnv
      ? 'Enter the admin password configured in environment variables.'
      : mode?.vaultInitialized
        ? 'Enter your vault password to unlock.'
        : 'First time? Set a password to create your vault.'

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1>2FA Vault</h1>
        <p className="info" style={{ marginTop: 0 }}>
          {hint}
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={isEnv ? 1 : 8}
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
