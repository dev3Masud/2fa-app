import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BRAND_ICONS, ServiceLogo, detectService } from '../lib/icons.jsx'
import IconPickerModal from './IconPickerModal.jsx'

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
  const [showIconPicker, setShowIconPicker] = useState(false)
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

  const modal = (
    <>
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
          <h2>{isEdit ? 'Rename Group' : 'Create New Group'}</h2>

          <form onSubmit={submit}>
            <div className="field">
              <label className="label">Group Name *</label>
              <input
                className="input"
                autoFocus
                placeholder="e.g. GITHUB, WORK, FINANCE..."
                value={name}
                onChange={handleNameChange}
                required
              />
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label className="label">Group Icon (Optional)</label>
              <div
                className="icon-picker-trigger"
                onClick={() => setShowIconPicker(true)}
              >
                <div className="icon-picker-trigger-left">
                  <ServiceLogo logo={logo} issuer={name} label={name} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {logo && BRAND_ICONS[logo] ? BRAND_ICONS[logo].name : logo ? 'Custom Icon' : 'Auto / Monogram'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Click to choose from 70+ icons
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn-sm">
                  Change Icon
                </button>
              </div>
            </div>

            {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}

            <div className="modal-actions" style={{ marginTop: 22 }}>
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

      {/* Dedicated Icon Picker Popup */}
      <IconPickerModal
        isOpen={showIconPicker}
        currentLogo={logo}
        issuer={name}
        label={name}
        onSelect={(newLogo) => setLogo(newLogo)}
        onClose={() => setShowIconPicker(false)}
      />
    </>
  )

  return createPortal(modal, document.body)
}
