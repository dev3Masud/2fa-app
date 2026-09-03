import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'
import AccountCard from '../components/AccountCard.jsx'
import AddAccount from '../components/AddAccount.jsx'

export default function Dashboard() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.listAccounts()
      setAccounts(res.accounts)
    } catch (e) {
      if (e.status === 401) {
        window.location.reload()
      } else {
        setErr(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function logout() {
    try {
      await api.logout()
    } catch (e) {
      console.error(e)
    }
    window.location.reload()
  }

  return (
    <div className="app">
      <div className="header">
        <div className="logo">
          <h1>2FA Vault</h1>
          <span className="badge">{accounts.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add</button>
          <button className="btn" onClick={logout}>Lock</button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {loading ? (
        <div className="empty">Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="card empty">
          No accounts yet. Click <strong>+ Add</strong> to import your first 2FA code.
        </div>
      ) : (
        <div className="account-list">
          {accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              onDelete={(id) => setAccounts((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddAccount
          onClose={() => setShowAdd(false)}
          onCreated={(acc) => {
            setAccounts((list) => [...list, acc])
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}
