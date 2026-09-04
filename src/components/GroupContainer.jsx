import { useState } from 'react'
import AccountCard from './AccountCard.jsx'
import { ServiceLogo } from '../lib/icons.jsx'
import DeleteModal from './DeleteModal.jsx'
import GroupModal from './GroupModal.jsx'
import { useDragReorder, reorderArray } from '../lib/useDragReorder.js'

export default function GroupContainer({
  group, // { id, name, logo, count }
  accounts = [],
  codes = {},
  tickerRemaining = {},
  masked = false,
  onDeleteAccount,
  onUpdateAccount,
  onRenameGroup,
  onDeleteGroup,
  onAddAccountToGroup,
  onReorderAccounts,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isCustomGroup = Boolean(group.id && group.id !== 'ungrouped' && group.id !== 'all')

  // ── Drag-to-reorder accounts inside this group ──────────────────────────
  const {
    getDragProps,
    getDropZoneProps,
    draggingId,
    dropTargetId,
    dropPosition,
  } = useDragReorder({
    items: accounts,
    onReorder: (sourceId, targetId, position) => {
      if (!onReorderAccounts) return
      // Only allow reordering if both source and target belong to this group.
      const src = accounts.find((a) => a.id === sourceId)
      const tgt = accounts.find((a) => a.id === targetId)
      if (!src || !tgt) return
      const reordered = reorderArray(accounts, sourceId, targetId, position)
      onReorderAccounts(group, reordered)
    },
    getId: (a) => a.id,
  })

  return (
    <div className="group-container">
      {/* Group Header */}
      <div className="group-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="group-header-left">
          <ServiceLogo
            logo={group.logo}
            issuer={group.name}
            label={group.name}
            size={24}
            style={{ borderRadius: 6 }}
          />
          <span className="group-title">{group.name}</span>
          <span className="group-count-badge">{accounts.length}</span>
        </div>

        <div className="group-header-right" onClick={(e) => e.stopPropagation()}>
          {/* Add account directly to this group */}
          <button
            className="group-action-btn"
            onClick={() => onAddAccountToGroup(group.name)}
            title={`Add account to ${group.name}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Rename group */}
          {isCustomGroup && (
            <button
              className="group-action-btn"
              onClick={() => setShowRenameModal(true)}
              title="Rename Group"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}

          {/* Delete group */}
          {isCustomGroup && (
            <button
              className="group-action-btn btn-danger"
              onClick={() => setShowDeleteModal(true)}
              title="Delete Group"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}

          {/* Collapse/Expand indicator */}
          <button
            className="group-action-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand group' : 'Collapse group'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Group Items */}
      {!collapsed && (
        <div className="group-items" {...getDropZoneProps()}>
          {accounts.length === 0 ? (
            <div className="group-empty-hint">
              No accounts in this group yet.{' '}
              <button
                className="btn-link"
                onClick={() => onAddAccountToGroup(group.name)}
              >
                + Add one
              </button>
            </div>
          ) : (
            accounts.map((acc) => {
              const codeData = codes[acc.id]
              const rem =
                tickerRemaining[acc.id] ?? codeData?.remaining ?? acc.period
              const isDragging = draggingId === acc.id
              const isDropTarget = dropTargetId === acc.id
              const dropClass =
                isDropTarget && dropPosition === 'before'
                  ? ' drop-before'
                  : isDropTarget && dropPosition === 'after'
                    ? ' drop-after'
                    : ''
              return (
                <div
                  key={acc.id}
                  className={`account-row${isDragging ? ' dragging' : ''}${dropClass}`}
                  {...getDragProps(acc.id)}
                >
                  <span
                    className="drag-handle"
                    aria-hidden="true"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="6" r="1.4" fill="currentColor" />
                      <circle cx="9" cy="12" r="1.4" fill="currentColor" />
                      <circle cx="9" cy="18" r="1.4" fill="currentColor" />
                      <circle cx="15" cy="6" r="1.4" fill="currentColor" />
                      <circle cx="15" cy="12" r="1.4" fill="currentColor" />
                      <circle cx="15" cy="18" r="1.4" fill="currentColor" />
                    </svg>
                  </span>
                  <AccountCard
                    account={acc}
                    code={codeData?.code}
                    remaining={rem}
                    period={acc.period}
                    masked={masked}
                    onDelete={onDeleteAccount}
                    onUpdate={onUpdateAccount}
                  />
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <GroupModal
          isOpen={showRenameModal}
          initialName={group.name}
          initialLogo={group.logo}
          isEdit={true}
          onSave={(newName, newLogo) => {
            onRenameGroup(group.id, newName, newLogo)
            setShowRenameModal(false)
          }}
          onClose={() => setShowRenameModal(false)}
        />
      )}

      {/* Delete Group Modal */}
      {showDeleteModal && (
        <DeleteModal
          isOpen={showDeleteModal}
          title="Delete Group"
          message="Are you sure you want to delete this group? Accounts inside will not be deleted; they will be moved to Ungrouped."
          itemName={group.name}
          onConfirm={() => {
            onDeleteGroup(group.id)
            setShowDeleteModal(false)
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}