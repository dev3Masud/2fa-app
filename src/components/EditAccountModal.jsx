import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { BRAND_ICONS, ServiceLogo, detectService } from '../lib/icons.jsx'
import {
  getCustomGroups,
  createCustomGroup,
  setAccountMeta,
  subscribeGroups,
} from '../lib/groupsStorage.js'
import { api } from '../lib/api.js'
import IconPickerModal from './IconPickerModal.jsx'
import GroupModal from './GroupModal.jsx'

export default function EditAccountModal({
  isOpen,
  account,
  onClose,
  onUpdated,
}) {
  const [label, setLabel] = useState(account?.label || '')
  const [issuer, setIssuer] = useState(account?.issuer || '')
  const [group, setGroup] = useState(account?.group || '')
  const [logo, setLogo] = useState(account?.logo || '')
  const [customGroups, setCustomGroups] = useState([])
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // Sync state whenever modal is opened or target account changes
  useEffect(() => {
    if (isOpen && account) {
      setLabel(account.label || '')
      setIssuer(account.issuer || '')
      setGroup(account.group || '')
      setLogo(account.logo || '')
      setCustomGroups(getCustomGroups())
      setErr('')
    }
  }, [isOpen, account])

  // Reactively track groups created or renamed
  useEffect(() => {
    setCustomGroups(getCustomGroups())
    const unsubscribe = subscribeGroups(() => {
      setCustomGroups(getCustomGroups())
    })
    return unsubscribe
  }, [])

  if (!isOpen || !account) return null

  // Ensure current group is selectable even if not yet saved in customGroups
  const groupExistsInList =
    !group || customGroups.some((g) => g.name.toLowerCase() === group.toLowerCase())

  function handleIssuerChange(e) {
    const val = e.target.value
    setIssuer(val)
    if (!logo || BRAND_ICONS[logo]) {
      const auto = detectService(val)
      if (auto) setLogo(auto)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!label.trim()) {
      setErr('Account label is required')
      return
    }

    setLoading(true)
    const payload = {
      label: label.trim(),
      issuer: issuer.trim(),
      group_name: group,
      logo: logo,
    }

    try {
      const res = await api.updateAccount(account.id, payload)
      setAccountMeta(account.id, { group, logo })
      const merged = {
        ...account,
        ...(res?.account || {}),
        group,
        logo,
      }
      onUpdated(merged)
      onClose()
    } catch (e) {
      console.error(e)
      setAccountMeta(account.id, { group, logo })
      onUpdated({ ...account, ...payload, group, logo })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const modal = (
    <>
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <h2>Edit 2FA Account</h2>

          <form onSubmit={submit}>
            {/* Account Icon Trigger */}
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="label">Icon / Logo</label>
              <div
                className="icon-picker-trigger"
                onClick={() => setShowIconPicker(true)}
              >
                <div className="icon-picker-trigger-left">
                  <ServiceLogo logo={logo} issuer={issuer} label={label} size={42} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {logo && BRAND_ICONS[logo] ? BRAND_ICONS[logo].name : logo ? 'Custom Logo' : 'Auto Initials'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Click to choose from 70+ logos or upload
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn-sm">
                  Change Icon
                </button>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label className="label">Label / Name *</label>
                <input
                  className="input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="label">Issuer (Service)</label>
                <input
                  className="input"
                  value={issuer}
                  onChange={handleIssuerChange}
                  placeholder="e.g. GitHub, Google"
                />
              </div>
            </div>

            {/* Group / Category Selector with inline Create Group */}
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Group / Category</label>
                <button
                  type="button"
                  className="btn-link"
                  style={{ fontSize: 12, padding: 0 }}
                  onClick={() => setShowCreateGroupModal(true)}
                >
                  <FontAwesomeIcon icon={faPlus} style={{ fontSize: 11 }} /> Create New Group
                </button>
              </div>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="input"
              >
                <option value="">(No Group / Ungrouped)</option>
                {!groupExistsInList && (
                  <option value={group}>
                    {group} (Current)
                  </option>
                )}
                {customGroups.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                <strong>Algorithm:</strong> {account.algorithm} &nbsp;|&nbsp; <strong>Type:</strong> {account.type.toUpperCase()} &nbsp;|&nbsp; <strong>Digits:</strong> {account.digits}d
              </div>
            </div>

            {err && <div className="error">{err}</div>}

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Dedicated Icon Picker Modal */}
      <IconPickerModal
        isOpen={showIconPicker}
        currentLogo={logo}
        issuer={issuer}
        label={label}
        onSelect={(newLogo) => setLogo(newLogo)}
        onClose={() => setShowIconPicker(false)}
      />

      {/* Inline Create Group Modal */}
      {showCreateGroupModal && (
        <GroupModal
          isOpen={showCreateGroupModal}
          onSave={(newName, newLogo) => {
            const created = createCustomGroup(newName, newLogo)
            setCustomGroups(getCustomGroups())
            setGroup(created.name)
            setShowCreateGroupModal(false)
          }}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}
    </>
  )

  return createPortal(modal, document.body)
}
