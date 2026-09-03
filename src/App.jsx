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
      .catch((e) => setAuthed(e.status !== 401 ? true : false))
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

