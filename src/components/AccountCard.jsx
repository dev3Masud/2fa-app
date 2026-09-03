import { useState } from 'react'
import Countdown from './Countdown.jsx'
import { ServiceLogo } from '../lib/icons.jsx'
import DeleteModal from './DeleteModal.jsx'
import EditAccountModal from './EditAccountModal.jsx'
import { api } from '../lib/api.js'

export default function AccountCard({
  account,
  code: liveCode,
  remaining = 30,
  period = 30,
  masked = false,
  onDelete,
  onUpdate,
}) {
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hotpCounter, setHotpCounter] = useState(account.counter ?? 0)
  const [manualCode, setManualCode] = useState(null)
  const [loadingCode, setLoadingCode] = useState(false)

  // Use live code if provided, otherwise manual/local code
  const code = manualCode || liveCode

  async function copyCode(e) {
    if (e) e.stopPropagation()
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Clipboard copy failed', err)
    }
  }

  async function handleNextHotp(e) {
    e.stopPropagation()
    setLoadingCode(true)
    try {
      const nextCounter = Number(hotpCounter) + 1
      const res = await api.getCode(account.id, nextCounter)
      setManualCode(res.code)
      setHotpCounter(nextCounter)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingCode(false)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await api.deleteAccount(account.id)
      onDelete(account.id)
      setShowDeleteModal(false)
    } catch (e) {
      alert(e.message || 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  // Format code into grouped segments, e.g. "215 568"
  function formatCode(c) {
    if (!c) return '••••••'
    if (masked) return '••••••'
    if (c.length === 6) return `${c.slice(0, 3)} ${c.slice(3)}`
    if (c.length === 8) return `${c.slice(0, 4)} ${c.slice(4)}`
    return c.match(/.{1,3}/g)?.join(' ') || c
  }

  return (
    <>
      <div className={`account-card ${copied ? 'copied-flash' : ''}`}>
        {/* Left: Logo & Account Info */}
        <div className="account-left">
          <ServiceLogo
            logo={account.logo}
            issuer={account.issuer}
            label={account.label}
            size={40}
          />
          <div className="account-info">
            <div className="account-label-row">
              <span className="account-label" title={account.label}>
                {account.label}
              </span>
              {account.group && (
                <span
                  className="account-group-tag"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEditModal(true)
                  }}
                  title="Click to change group"
                >
                  {account.group}
                </span>
              )}
            </div>
            <div className="account-meta-text">
              {account.issuer ? `${account.issuer} · ` : ''}
              {account.type.toUpperCase()} · {account.digits}d · {account.algorithm}
            </div>
          </div>
        </div>

        {/* Right: Live Code & Live Timer & Actions */}
        <div className="code-block">
          {account.type === 'hotp' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                className="code"
                onClick={copyCode}
                title="Click to copy code"
              >
                {formatCode(code)}
              </div>
              <button
                className="btn btn-sm"
                onClick={handleNextHotp}
                disabled={loadingCode}
                title="Generate next counter code"
              >
                {loadingCode ? '…' : `Next (#${hotpCounter})`}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className={`code ${remaining <= 5 ? 'expired' : ''}`}
                onClick={copyCode}
                title="Click to copy code"
              >
                {formatCode(code)}
              </div>
              <Countdown remaining={remaining} period={period} size={36} />
            </div>
          )}

          {/* Actions: Copy icon button, Edit button, Delete button */}
          <div className="card-actions">
            <button
              className={`btn-icon ${copied ? 'success' : ''}`}
              onClick={copyCode}
              title={copied ? 'Copied!' : 'Copy Code'}
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>

            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation()
                setShowEditModal(true)
              }}
              title="Edit Account"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>

            <button
              className="btn-icon btn-danger"
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteModal(true)
              }}
              title="Delete Account"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        account={account}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Edit Modal */}
      <EditAccountModal
        isOpen={showEditModal}
        account={account}
        onClose={() => setShowEditModal(false)}
        onUpdated={(updated) => {
          if (onUpdate) onUpdate(updated)
        }}
      />
    </>
  )
}
