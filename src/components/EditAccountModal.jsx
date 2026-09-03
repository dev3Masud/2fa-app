import { useState, useRef } from 'react'
import { BRAND_ICONS, ServiceLogo, detectService } from '../lib/icons.jsx'
import { getCustomGroups, setAccountMeta } from '../lib/groupsStorage.js'
import { api } from '../lib/api.js'

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
  const [logoTab, setLogoTab] = useState('preset') // preset | url | upload
  const [customUrl, setCustomUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef()

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

  function handleFileUpload(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr('Please select an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogo(reader.result)
    }
    reader.readAsDataURL(file)
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
      // 1. Update API
      const res = await api.updateAccount(account.id, payload)
      // 2. Persist in local storage
      setAccountMeta(account.id, { group, logo })
      onUpdated(res.account || { ...account, ...payload, group })
      onClose()
    } catch (e) {
      console.error(e)
      // If API fails due to schema or network, still persist locally
      setAccountMeta(account.id, { group, logo })
      onUpdated({ ...account, ...payload, group })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h2>Edit Account</h2>

        <form onSubmit={submit}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <ServiceLogo logo={logo} issuer={issuer} label={label} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{label || 'Account'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {issuer || 'No issuer'} · {account.digits}d · {account.type.toUpperCase()}
              </div>
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

          <div className="field">
            <label className="label">Custom Logo / Icon</label>
            <div className="tabs" style={{ marginBottom: 10 }}>
              <button
                type="button"
                className={`tab ${logoTab === 'preset' ? 'active' : ''}`}
                onClick={() => setLogoTab('preset')}
              >
                Presets
              </button>
              <button
                type="button"
                className={`tab ${logoTab === 'url' ? 'active' : ''}`}
                onClick={() => setLogoTab('url')}
              >
                Image URL
              </button>
              <button
                type="button"
                className={`tab ${logoTab === 'upload' ? 'active' : ''}`}
                onClick={() => setLogoTab('upload')}
              >
                Upload File
              </button>
            </div>

            {logoTab === 'preset' && (
              <div className="icon-presets-grid" style={{ maxHeight: 120, overflowY: 'auto' }}>
                <button
                  type="button"
                  className={`icon-preset-btn ${!logo ? 'active' : ''}`}
                  onClick={() => setLogo('')}
                >
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Auto / Initials</span>
                </button>
                {Object.entries(BRAND_ICONS).map(([key, brand]) => (
                  <button
                    key={key}
                    type="button"
                    className={`icon-preset-btn ${logo === key ? 'active' : ''}`}
                    onClick={() => setLogo(key)}
                    title={brand.name}
                  >
                    <ServiceLogo logo={key} size={20} />
                    <span>{brand.name}</span>
                  </button>
                ))}
              </div>
            )}

            {logoTab === 'url' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="https://example.com/logo.png"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (customUrl.trim()) setLogo(customUrl.trim())
                  }}
                >
                  Set
                </button>
              </div>
            )}

            {logoTab === 'upload' && (
              <div
                className="dropzone"
                style={{ padding: 16 }}
                onClick={() => fileRef.current?.click()}
              >
                <span>Click to browse image file</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
              </div>
            )}
          </div>

          {err && <div className="error">{err}</div>}

          <div className="modal-actions">
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
  )
}
