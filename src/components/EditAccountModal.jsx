import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BRAND_ICONS, ServiceLogo, detectService } from '../lib/icons.jsx'
import { getCustomGroups, setAccountMeta } from '../lib/groupsStorage.js'
import { api } from '../lib/api.js'
import IconPickerModal from './IconPickerModal.jsx'

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
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  if (!isOpen || !account) return null

  const customGroups = getCustomGroups()

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
      onUpdated(res.account || { ...account, ...payload, group })
      onClose()
    } catch (e) {
      console.error(e)
      setAccountMeta(account.id, { group, logo })
      onUpdated({ ...account, ...payload, group })
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

            <div className="field">
              <label className="label">Group / Category</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="input"
              >
                <option value="">(No Group / Ungrouped)</option>
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
    </>
  )

  return createPortal(modal, document.body)
}
