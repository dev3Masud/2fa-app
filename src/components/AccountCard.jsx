import { useState } from 'react'
import Countdown from './Countdown.jsx'
import { api } from '../lib/api.js'

export default function AccountCard({ account, onDelete }) {
  const [code, setCode] = useState(null)
  const [remaining, setRemaining] = useState(account.period)
  const [loading, setLoading] = useState(false)
  const [showCopied, setShowCopied] = useState(false)

  async function fetchCode() {
    setLoading(true)
    try {
      const res = await api.getCode(account.id)
      setCode(res.code)
      setRemaining(res.remaining ?? account.period)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1500)
  }

  async function del() {
    if (!confirm(`Delete ${account.label}?`)) return
    try {
      await api.deleteAccount(account.id)
      onDelete(account.id)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="account-card">
      <div className="account-info">
        {account.issuer && <div className="account-issuer">{account.issuer}</div>}
        <div className="account-label">{account.label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          {account.type.toUpperCase()} · {account.digits}d · {account.algorithm}
        </div>
      </div>
      <div className="code-block">
        {code ? (
          <>
            <div
              className={`code ${remaining < 2 ? 'expired' : ''}`}
              onClick={copyCode}
              title="Click to copy"
            >
              {code.match(/.{1,3}/g)?.join(' ') || code}
            </div>
            <Countdown remaining={remaining} period={account.period} />
          </>
        ) : (
          <button className="btn" onClick={fetchCode} disabled={loading}>
            {loading ? '…' : 'Show code'}
          </button>
        )}
        <button
          className="btn btn-ghost btn-danger"
          onClick={del}
          title="Delete"
          style={{ padding: '4px 8px' }}
        >
          ×
        </button>
      </div>
      {showCopied && <div className="copied-toast">Copied!</div>}
    </div>
  )
}
