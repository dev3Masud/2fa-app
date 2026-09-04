import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck, faPenToSquare, faXmark } from '@fortawesome/free-solid-svg-icons'
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
  editMode = false,
  onDelete,
  onUpdate,
}) {
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [inlineConfirmDelete, setInlineConfirmDelete] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hotpCounter, setHotpCounter] = useState(account.counter ?? 0)
  const [manualCode, setManualCode] = useState(null)
  const [loadingCode, setLoadingCode] = useState(false)

  const code = manualCode || liveCode

  async function copyCode(e) {
    if (e) e.stopPropagation()
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
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
      setInlineConfirmDelete(false)
    }
  }

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

          {/* Actions: copy, edit, and (edit-mode-only) inline delete */}
          <div className="card-actions">
            <button
              className={`btn-icon ${copied ? 'success' : ''}`}
              onClick={copyCode}
              title={copied ? 'Copied!' : 'Copy Code'}
              aria-label="Copy code"
            >
              {copied ? (
                <FontAwesomeIcon icon={faCheck} style={{ fontSize: 16 }} />
              ) : (
                <FontAwesomeIcon icon={faCopy} style={{ fontSize: 16 }} />
              )}
            </button>

            {!editMode && (
              <button
                className="btn-icon"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEditModal(true)
                }}
                title="Edit Account"
                aria-label="Edit account"
              >
                <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 15 }} />
              </button>
            )}

            {/* Delete button: fades + slides in only when editMode is on.
                Two-step inline confirm: first click reveals Confirm/Cancel,
                second click deletes. Auto-collapses if the user clicks away. */}
            {editMode && (
              <div
                className={`delete-cluster ${inlineConfirmDelete ? 'confirming' : ''}`}
                onMouseLeave={() => setInlineConfirmDelete(false)}
              >
                {!inlineConfirmDelete ? (
                  <button
                    className="btn-icon btn-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      setInlineConfirmDelete(true)
                    }}
                    title="Delete account"
                    aria-label="Delete account"
                  >
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                  </button>
                ) : (
                  <div className="delete-confirm">
                    <button
                      className="btn btn-sm btn-danger-solid"
                      disabled={deleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        confirmDelete()
                      }}
                    >
                      {deleting ? '…' : 'Confirm'}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setInlineConfirmDelete(false)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-step modal (kept as a power-user fallback; the inline flow above
          is the default in edit mode). */}
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