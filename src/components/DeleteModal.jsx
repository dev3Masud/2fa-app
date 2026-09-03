export default function DeleteModal({
  isOpen,
  title = 'Delete Account',
  message = 'Are you sure you want to delete this account? This action cannot be undone.',
  itemName = '',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6m4-6v6" />
          </svg>
        </div>
        <h2 style={{ marginBottom: 8, fontSize: 19 }}>{title}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
          {message}
          {itemName && (
            <strong style={{ display: 'block', color: 'var(--text)', marginTop: 6, fontWeight: 600 }}>
              &ldquo;{itemName}&rdquo;
            </strong>
          )}
        </p>

        <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger-solid" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
