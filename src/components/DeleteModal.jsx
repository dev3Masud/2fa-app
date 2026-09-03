import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ServiceLogo } from '../lib/icons.jsx'

const CONFIRM_PHRASE = 'SUDO DELETE'

export default function DeleteModal({
  isOpen,
  account,
  // Legacy / Group deletion props
  title: customTitle,
  message: customMessage,
  itemName,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [step, setStep] = useState(1)
  const [confirmText, setConfirmText] = useState('')
  const inputRef = useRef(null)

  // Reset whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setConfirmText('')
    }
  }, [isOpen])

  // Auto-focus input when reaching step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => inputRef.current?.focus(), 90)
    }
  }, [step])

  if (!isOpen) return null

  const isGroupDelete = Boolean(!account && (itemName || customTitle?.toLowerCase().includes('group')))
  const accountName = account?.label || itemName || ''
  const accountIssuer = account?.issuer || ''
  const isConfirmed = confirmText.trim().toUpperCase() === CONFIRM_PHRASE

  function handleSubmit(e) {
    e.preventDefault()
    if (step === 1) {
      setStep(2)
      return
    }
    if (step === 2 && isConfirmed && !loading) {
      onConfirm()
    }
  }

  const modal = (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 1200 }}>
      <div
        className="modal delete-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460, border: '1px solid rgba(239, 68, 68, 0.2)' }}
      >
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: step === s ? 'rgba(239, 68, 68, 0.18)' : 'var(--panel-2)',
                  color: step === s ? '#ef4444' : 'var(--muted)',
                  border: step === s ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {step > s ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  `${s}. `
                )}
                {s === 1 ? 'Warning' : 'Confirm'}
              </span>
              {s === 1 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>}
            </div>
          ))}
        </div>

        {/* Danger Icon with glowing border */}
        <div className="delete-modal-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* ── STEP 1: Warning ── */}
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: 8, fontSize: 19 }}>
              {customTitle || (isGroupDelete ? 'Delete Group?' : 'Delete 2FA Account?')}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.55 }}>
              {customMessage ||
                (isGroupDelete
                  ? 'You are about to delete this group. Accounts inside will not be deleted; they will be moved to Ungrouped.'
                  : 'You are about to permanently delete this 2FA account from your vault.')}
            </p>

            {/* Target Item preview card */}
            {(accountName || account) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'var(--panel-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  marginBottom: 16,
                }}
              >
                {account && (
                  <ServiceLogo logo={account.logo} issuer={account.issuer} label={account.label} size={36} />
                )}
                <div style={{ textAlign: 'left', overflow: 'hidden', flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {accountName}
                  </div>
                  {accountIssuer && (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{accountIssuer}</div>
                  )}
                  {account?.group && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                      Group: {account.group}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning Callout Box with SVG */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                textAlign: 'left',
                fontSize: 12.5,
                color: '#fca5a5',
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <strong>Warning:</strong>{' '}
                {isGroupDelete
                  ? 'Deleting this group cannot be undone. All 2FA accounts inside this group will be moved to Ungrouped.'
                  : 'This action is permanent and cannot be undone. If you lose access to this 2FA secret, you may get locked out of your account.'}
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger-solid"
                onClick={() => setStep(2)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Type SUDO DELETE ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ marginBottom: 6, fontSize: 19, color: '#ef4444' }}>Final Confirmation</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.55 }}>
              To permanently delete{' '}
              <strong style={{ color: 'var(--text)' }}>
                {accountName || (isGroupDelete ? 'this group' : 'this account')}
              </strong>
              , type{' '}
              <code
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  padding: '2px 7px',
                  borderRadius: 4,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                {CONFIRM_PHRASE}
              </code>{' '}
              in the box below:
            </p>

            {/* Beautiful Custom Input Field with Left SVG Icon */}
            <div className="delete-input-wrap">
              <div className="delete-input-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isConfirmed ? '#10b981' : '#ef4444'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>

              <input
                ref={inputRef}
                type="text"
                className={`delete-confirm-input ${isConfirmed ? 'confirmed' : ''}`}
                placeholder={`Type: ${CONFIRM_PHRASE}`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Live validation & status bar */}
            <div className="delete-status-bar">
              <div>
                {confirmText && !isConfirmed && (
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {CONFIRM_PHRASE.startsWith(confirmText.trim().toUpperCase())
                      ? `Keep typing… ${CONFIRM_PHRASE.length - confirmText.trim().length} chars left`
                      : '✗ Does not match — must type: ' + CONFIRM_PHRASE}
                  </span>
                )}
                {isConfirmed && (
                  <span style={{ color: '#10b981', fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Ready to delete
                  </span>
                )}
              </div>

              {/* Status badge pill */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: isConfirmed ? 'rgba(16, 185, 129, 0.15)' : 'var(--panel-2)',
                  color: isConfirmed ? '#10b981' : 'var(--muted)',
                  border: `1px solid ${isConfirmed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                  transition: 'all 0.2s',
                }}
              >
                {confirmText.trim().length} / {CONFIRM_PHRASE.length}
              </span>
            </div>

            {/* Modal Actions with SVG Trash Icon */}
            <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={loading}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setStep(1)}
                disabled={loading}
                style={{ borderColor: 'var(--border)' }}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn btn-danger-solid"
                disabled={!isConfirmed || loading}
                style={{
                  opacity: !isConfirmed || loading ? 0.55 : 1,
                  cursor: !isConfirmed || loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    {/* SVG Trash Icon instead of emoji */}
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    <span>{isGroupDelete ? 'Delete Group Forever' : 'Delete Forever'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
