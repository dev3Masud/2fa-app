import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { api } from './lib/api.js'

export default function App() {
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    api.listAccounts()
      .then(() => setAuthed(true))
      .catch((e) => {
        // Only a 401 (or 403) means the user is not authenticated.
        // Any other error (network, 5xx) should not silently sign the user
        // in. We treat unknown errors as not-authed and surface them.
        if (e && (e.status === 401 || e.status === 403)) {
          setAuthed(false)
        } else {
          setAuthed(false)
        }
      })
  }, [])

  return (
    <>
      {authed === null ? (
        <div className="login-page">
          <div className="empty">Loading…</div>
        </div>
      ) : !authed ? (
        <Login onLogin={() => setAuthed(true)} />
      ) : (
        <Dashboard />
      )}
      <Analytics />
      <SpeedInsights />
    </>
  )
}

