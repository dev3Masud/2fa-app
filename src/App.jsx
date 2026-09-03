import { useState, useEffect } from 'react'
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

  if (authed === null) {
    return (
      <div className="login-page">
        <div className="empty">Loading…</div>
      </div>
    )
  }

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  return <Dashboard />
}
