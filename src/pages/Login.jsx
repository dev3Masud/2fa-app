import { useState } from 'react'
import { api } from '../lib/api.js'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await api.login(password)
      onLogin(res)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1>2FA Vault</h1>
        <p className="info" style={{ marginTop: 0 }}>
          Enter your password to unlock. First time? Your password becomes the master key.
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
              minLength={8}
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
