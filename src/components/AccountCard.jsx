import { useState, useEffect, useRef, useCallback } from 'react'
import Countdown from './Countdown.jsx'
import Logo from './Logo.jsx'
import { api } from '../lib/api.js'
import { issuerMeta } from '../lib/branding.js'

export default function AccountCard({ account, onDelete, onError }) {
  const [code, setCode] = useState(null)
  const [remaining, setRemaining] = useState(account.period)
  const [loading, setLoading] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [error, setError] = useState('')
  const meta = issuerMeta(account.issuer || account.label)
  const tickRef = useRef(null)
  const mountedRef = useRef(true)

  const fetchCode = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError('')
    try {
      const res = await api.getCode(account.id)
      if (!mountedRef.current) return
      setCode(res.code)
      setRemaining(res.remaining ?? account.period)
    } catch (e) {
      if (mountedRef.current) {
        setError(e.message)
        if (onError) onError(e)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [account.id, account.period, onError])

  // Auto-fetch on mount
  useEffect(() => {
    mountedRef.current = true
    fetchCode()
    return () => {
      mountedRef.current = false
    }
  }, [fetchCode])

  // Live tick: decrement remaining every second
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (code == null) return
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // Timer hit zero — fetch a new code
          fetchCode()
          return account.period
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [code, account.period, fetchCode])

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code).catch(() => {
      // Fallback for non-HTTPS contexts
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch (e) { /* clipboard not available */ }
      document.body.removeChild(ta)
    })
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1500)
  }

  return (
    <div className="account-card">
      <Logo meta={meta} size={40} />
      <div className="account-info">
        <div className="account-issuer">{meta.name}</div>
        <div className="account-label">{account.label}</div>
        <div className="account-meta">
          {account.type.toUpperCase()} · {account.digits}d · {account.algorithm}
        </div>
      </div>
      <div className="code-block">
        {error ? (
          <div className="code error-code" onClick={fetchCode} title="Click to retry">
            Error
          </div>
        ) : code ? (
          <>
            <div
              className={`code ${remaining < 3 ? 'expiring' : ''} ${loading ? 'refreshing' : ''}`}
              onClick={copyCode}
              title="Click to copy"
            >
              {code.match(/.{1,3}/g)?.join(' ') || code}
            </div>
            <Countdown remaining={remaining} period={account.period} />
          </>
        ) : (
          <div className="code-placeholder">…</div>
        )}
        <button
          className="btn btn-ghost btn-icon btn-danger"
          onClick={() => onDelete(account)}
          title="Delete"
          aria-label="Delete"
        >
          ×
        </button>
      </div>
      {showCopied && <div className="copied-toast">Copied!</div>}
    </div>
  )
}
