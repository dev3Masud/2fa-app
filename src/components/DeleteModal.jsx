import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ServiceLogo } from '../lib/icons.jsx'

const CONFIRM_PHRASE = 'SUDO DELETE'

export default function DeleteModal({
  isOpen,
  account,
  // legacy props kept for compatibility (unused in new 2-step flow)
  title: _title,
  message: _message,
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
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [step])

  if (!isOpen) return null

  const isConfirmed = confirmText.trim() === CONFIRM_PHRASE

  // Support legacy usage (GroupContainer uses itemName/title/message)
  const accountName = account?.label || itemName || ''
  const accountIssuer = account?.issuer || ''

  function handleSubmit(e) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    if (step === 2 && isConfirmed && !loading) onConfirm()
  }

  const modal = (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 1200 }}>
      <div
        className="modal delete-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                padding: '3px 10px',
                borderRadius: 999,
                background: step === s ? 'rgba(239, 68, 68, 0.18)' : 'var(--panel-2)',
                color: step === s ? '#ef4444' : 'var(--muted)',
                border: step === s ? '1px solid rgba(239,68,68,0.35)' : '1px solid transparent',
                transition: 'all 0.2s',
              }}>
                {step > s ? '✓ ' : `${s}. `}
                {s === 1 ? 'Warning' : 'Confirm'}
              </span>
              {s === 1 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>}
            </div>
          ))}
        </div>

        {/* Icon */}
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
            <h2 style={{ marginBottom: 8, fontSize: 19 }}>Delete 2FA Account?</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 14px', lineHeight: 1.55 }}>
              You are about to permanently delete this 2FA account from your vault.
            </p>

            {/* Account preview card */}
            {(accountName || account) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: 'var(--panel-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                marginBottom: 14,
              }}>
                {account && (
                  <ServiceLogo logo={account.logo} issuer={account.issuer} label={account.label} size={34} />
                )}
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {accountName}
                  </div>
                  {accountIssuer && (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{accountIssuer}</div>
                  )}
                </div>
              </div>
            )}

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              textAlign: 'left',
              fontSize: 12,
              color: '#fca5a5',
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              ⚠️ <strong>Warning:</strong> This action is <strong>permanent</strong> and cannot be undone.
              If you lose access to this 2FA account, you may be locked out of your service.
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
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 18px', lineHeight: 1.55 }}>
              To permanently delete{' '}
              <strong style={{ color: 'var(--text)' }}>{accountName || 'this account'}</strong>,
              type <code style={{
                fontFamily: 'monospace',
                background: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 700,
                letterSpacing: 1,
              }}>{CONFIRM_PHRASE}</code>{' '}
              in the box below:
            </p>

            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder={`Type: ${CONFIRM_PHRASE}`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              style={{
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
                borderColor: isConfirmed
                  ? 'rgba(239,68,68,0.7)'
                  : confirmText
                    ? 'rgba(239,68,68,0.3)'
                    : undefined,
              }}
            />

            {/* Live validation hint */}
            <div style={{ height: 22, marginTop: 6, marginBottom: 14, fontSize: 12 }}>
              {confirmText && !isConfirmed && (
                <span style={{ color: 'var(--muted)' }}>
                  {CONFIRM_PHRASE.startsWith(confirmText.trim().toUpperCase())
                    ? `Keep typing… ${CONFIRM_PHRASE.length - confirmText.trim().length} chars left`
                    : '✗ Does not match — type exactly: ' + CONFIRM_PHRASE}
                </span>
              )}
              {isConfirmed && (
                <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Confirmed — you may now delete</span>
              )}
            </div>

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
              >
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                      Deleting…
                    </span>
                  : '🗑 Delete Forever'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
