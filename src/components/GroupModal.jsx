import { useState } from 'react'
import { BRAND_ICONS, ServiceLogo, detectService } from '../lib/icons.jsx'

export default function GroupModal({
  isOpen,
  initialName = '',
  initialLogo = '',
  isEdit = false,
  onSave,
  onClose,
}) {
  const [name, setName] = useState(initialName)
  const [logo, setLogo] = useState(initialLogo)
  const [err, setErr] = useState('')

  if (!isOpen) return null

  function handleNameChange(e) {
    const val = e.target.value
    setName(val)
    if (!logo || BRAND_ICONS[logo]) {
      const auto = detectService(val)
      if (auto) setLogo(auto)
    }
  }

  function submit(e) {
    e.preventDefault()
    setErr('')
    const trimmed = name.trim()
    if (!trimmed) {
      setErr('Group name is required')
      return
    }
    try {
      onSave(trimmed, logo)
      onClose()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h2>{isEdit ? 'Rename Group' : 'Create New Group'}</h2>

        <form onSubmit={submit}>
          <div className="field">
            <label className="label">Group Name *</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <ServiceLogo logo={logo} issuer={name} label={name} size={36} />
              <input
                className="input"
                autoFocus
                placeholder="e.g. GITHUB, WORK, FINANCE..."
                value={name}
                onChange={handleNameChange}
                required
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">Group Icon (Optional)</label>
            <div className="icon-presets-grid" style={{ maxHeight: 110, overflowY: 'auto' }}>
              {Object.entries(BRAND_ICONS).map(([key, brand]) => (
                <button
                  key={key}
                  type="button"
                  className={`icon-preset-btn ${logo === key ? 'active' : ''}`}
                  onClick={() => setLogo(key === logo ? '' : key)}
                  title={brand.name}
                >
                  <ServiceLogo logo={key} size={22} />
                  <span>{brand.name}</span>
                </button>
              ))}
            </div>
          </div>

          {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}

          <div className="modal-actions" style={{ marginTop: 18 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
