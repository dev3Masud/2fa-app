import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../lib/api.js'
import AccountCard from '../components/AccountCard.jsx'
import AddAccount from '../components/AddAccount.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import Logo from '../components/Logo.jsx'
import { Toast } from '../components/Toast.jsx'
import { groupAccounts, filterAccounts } from '../lib/branding.js'

export default function Dashboard() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [toast, setToast] = useState('')

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

  const filtered = useMemo(() => filterAccounts(accounts, query), [accounts, query])
  const groups = useMemo(() => groupAccounts(filtered), [filtered])

  async function logout() {
    try {
      await api.logout()
    } catch (e) {
      console.error(e)
    }
    window.location.reload()
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const acc = pendingDelete
    setPendingDelete(null)
    try {
      await api.deleteAccount(acc.id)
      setAccounts((list) => list.filter((x) => x.id !== acc.id))
      showToast(`Deleted ${acc.label}`)
    } catch (e) {
      showToast(`Error: ${e.message}`)
    }
  }

  return (
    <div className="app">
      <div className="header">
        <div className="logo">
          <div className="app-logo-mark">2FA</div>
          <h1>Vault</h1>
          <span className="badge">{accounts.length}</span>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add</button>
          <button className="btn" onClick={logout}>Lock</button>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="search-bar">
          <input
            className="input search-input"
            type="search"
            placeholder="Search by name or issuer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              className="search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              title="Clear"
            >
              ×
            </button>
          )}
        </div>
      )}

      {err && <div className="error">{err}</div>}

      {loading ? (
        <div className="empty">Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="card empty">
          No accounts yet. Click <strong>+ Add</strong> to import your first 2FA code.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty">
          No matches for &ldquo;<strong>{query}</strong>&rdquo;.
        </div>
      ) : (
        <div className="groups">
          {groups.map((g) => (
            <section className="group" key={g.key}>
              <header className="group-header">
                <Logo meta={g.meta} size={28} />
                <h2 className="group-name">{g.meta.name}</h2>
                <span className="group-count">{g.items.length}</span>
              </header>
              <div className="account-list">
                {g.items.map((a) => (
                  <AccountCard
                    key={a.id}
                    account={a}
                    onDelete={(acc) => setPendingDelete(acc)}
                    onError={(e) => showToast(`Error: ${e.message}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showAdd && (
        <AddAccount
          onClose={() => setShowAdd(false)}
          onCreated={(acc) => {
            setAccounts((list) => [...list, acc])
            setShowAdd(false)
            showToast(`Added ${acc.label}`)
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          title="Delete account?"
          message={`This will permanently remove "${pendingDelete.label}" (${pendingDelete.issuer || 'no issuer'}). This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
