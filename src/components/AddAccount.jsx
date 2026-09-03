import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'
import { api } from '../lib/api.js'
import { BRAND_ICONS, ServiceLogo, detectService } from '../lib/icons.jsx'
import { getCustomGroups, createCustomGroup, setAccountMeta } from '../lib/groupsStorage.js'
import GroupModal from './GroupModal.jsx'

export default function AddAccount({ onClose, onCreated, defaultGroup = '' }) {
  const [tab, setTab] = useState('qr')
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()
  const logoFileRef = useRef()

  const [form, setForm] = useState({
    label: '',
    issuer: '',
    secret: '',
    type: 'totp',
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
    counter: 0,
    group: defaultGroup || '',
    logo: '',
  })
  const [uri, setUri] = useState('')

  // Logo selection tab inside manual tab
  const [logoTab, setLogoTab] = useState('preset')
  const [customLogoUrl, setCustomLogoUrl] = useState('')

  // Custom Groups state
  const [customGroups, setCustomGroups] = useState([])
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)

  useEffect(() => {
    setCustomGroups(getCustomGroups())
  }, [])

  function update(k, v) {
    setForm((f) => {
      const next = { ...f, [k]: v }
      // Auto-detect logo if issuer changes and user hasn't explicitly set a logo
      if (k === 'issuer' && (!f.logo || BRAND_ICONS[f.logo])) {
        const auto = detectService(v)
        if (auto) next.logo = auto
      }
      return next
    })
  }

  // Client-side instant QR reader for PNG, JPEG, WebP
  async function decodeQrClientSide(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, img.width, img.height)
            const imageData = ctx.getImageData(0, 0, img.width, img.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height)
            if (code && code.data) {
              resolve(code.data)
            } else {
              reject(new Error('No QR code detected in image'))
            }
          } catch (e) {
            reject(e)
          }
        }
        img.onerror = () => reject(new Error('Failed to load image for scanning'))
        img.src = reader.result
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  async function readFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr('Please choose an image file (PNG, JPG, WebP)')
      return
    }
    setErr('')
    setLoading(true)

    try {
      // 1. Try native client-side decoding
      let qrContent
      try {
        qrContent = await decodeQrClientSide(file)
      } catch (clientErr) {
        // 2. Fallback to server parsing
        const reader = new FileReader()
        qrContent = await new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              const res = await api.parseQr(reader.result)
              resolve(res.data)
            } catch (e) {
              reject(clientErr || e)
            }
          }
          reader.readAsDataURL(file)
        })
      }

      if (typeof qrContent === 'string') {
        const res = await api.parseUri(qrContent)
        applyParsedData(res.data)
      } else if (qrContent && typeof qrContent === 'object') {
        applyParsedData(qrContent)
      }
    } catch (e) {
      setErr(e.message || 'Could not scan QR code. Please try pasting the URI or manual entry.')
    } finally {
      setLoading(false)
    }
  }

  function applyParsedData(data) {
    const autoLogo = detectService(data.issuer || data.label) || ''
    setForm((f) => ({
      ...f,
      label: data.label || f.label,
      issuer: data.issuer || f.issuer,
      secret: data.secret,
      type: data.type || 'totp',
      digits: data.digits || 6,
      period: data.period || 30,
      algorithm: data.algorithm || 'SHA1',
      counter: data.counter || 0,
      logo: autoLogo,
    }))
    setTab('manual')
  }

  async function parseUriNow() {
    if (!uri.trim()) return
    setErr('')
    try {
      setLoading(true)
      const res = await api.parseUri(uri.trim())
      applyParsedData(res.data)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogoFileUpload(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr('Please select an image file for logo')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      update('logo', reader.result)
    }
    reader.readAsDataURL(file)
  }

  async function submit(e) {
    if (e) e.preventDefault()
    setErr('')
    if (!form.label.trim()) {
      setErr('Label is required')
      return
    }
    if (!form.secret.trim()) {
      setErr('Secret is required')
      return
    }

    try {
      setLoading(true)
      const payload = {
        ...form,
        label: form.label.trim(),
        issuer: form.issuer.trim(),
        group_name: form.group,
      }
      if (form.type === 'totp') delete payload.counter

      const res = await api.createAccount(payload)
      const createdAcc = res.account

      // Persist group & logo in local metadata
      setAccountMeta(createdAcc.id, {
        group: form.group,
        logo: form.logo,
      })

      onCreated({
        ...createdAcc,
        group: form.group,
        logo: form.logo,
      })
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <h2>Add 2FA Account</h2>
          <div className="tabs">
            <button className={`tab ${tab === 'qr' ? 'active' : ''}`} onClick={() => setTab('qr')}>
              Upload QR Image
            </button>
            <button className={`tab ${tab === 'uri' ? 'active' : ''}`} onClick={() => setTab('uri')}>
              Paste URI
            </button>
            <button className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
              Manual Entry
            </button>
          </div>

          {/* QR Upload Tab */}
          {tab === 'qr' && (
            <div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                readFile(e.dataTransfer.files?.[0])
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                {loading ? 'Scanning QR code…' : 'Drop QR screenshot here or click to browse'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Supports PNG, JPEG, and WebP
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => readFile(e.target.files?.[0])}
              />
            </div>
          )}

          {/* URI Tab */}
          {tab === 'uri' && (
            <div className="field">
              <label className="label">otpauth:// URI</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="otpauth://totp/GitHub:KamillyAgent?secret=JBSWY3DPEHPK3PXP&issuer=GitHub"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
              />
              <button
                className="btn btn-primary"
                style={{ marginTop: 10 }}
                onClick={parseUriNow}
                disabled={loading || !uri.trim()}
              >
                {loading ? 'Parsing…' : 'Parse URI'}
              </button>
            </div>
          )}

          {/* Manual Entry Tab */}
          {tab === 'manual' && (
            <form onSubmit={submit}>
              {/* Live Logo & Title Preview */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <ServiceLogo
                  logo={form.logo}
                  issuer={form.issuer}
                  label={form.label}
                  size={46}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {form.label || 'Account Preview'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {form.issuer ? `${form.issuer} · ` : ''}
                    {form.group ? `Group: ${form.group}` : 'No group'}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label className="label">Label / Name *</label>
                  <input
                    className="input"
                    value={form.label}
                    onChange={(e) => update('label', e.target.value)}
                    placeholder="e.g. KamillyAgent or user@gmail.com"
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">Issuer (Service)</label>
                  <input
                    className="input"
                    value={form.issuer}
                    onChange={(e) => update('issuer', e.target.value)}
                    placeholder="e.g. GitHub, Google"
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Secret (Base32) *</label>
                <input
                  className="input"
                  value={form.secret}
                  onChange={(e) => update('secret', e.target.value)}
                  placeholder="JBSWY3DPEHPK3PXP"
                  required
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              {/* Group Assignment */}
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="label" style={{ margin: 0 }}>Assign to Group</label>
                  <button
                    type="button"
                    className="btn-link"
                    style={{ fontSize: 12 }}
                    onClick={() => setShowCreateGroupModal(true)}
                  >
                    + Create New Group
                  </button>
                </div>
                <select
                  className="input"
                  value={form.group}
                  onChange={(e) => update('group', e.target.value)}
                >
                  <option value="">(No Group / Ungrouped)</option>
                  {customGroups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logo Picker Section */}
              <div className="field">
                <label className="label">Logo / Icon</label>
                <div className="tabs" style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    className={`tab ${logoTab === 'preset' ? 'active' : ''}`}
                    onClick={() => setLogoTab('preset')}
                  >
                    Brand Presets
                  </button>
                  <button
                    type="button"
                    className={`tab ${logoTab === 'url' ? 'active' : ''}`}
                    onClick={() => setLogoTab('url')}
                  >
                    Custom URL
                  </button>
                  <button
                    type="button"
                    className={`tab ${logoTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setLogoTab('upload')}
                  >
                    Upload Image
                  </button>
                </div>

                {logoTab === 'preset' && (
                  <div className="icon-presets-grid" style={{ maxHeight: 110, overflowY: 'auto' }}>
                    <button
                      type="button"
                      className={`icon-preset-btn ${!form.logo ? 'active' : ''}`}
                      onClick={() => update('logo', '')}
                    >
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Auto Initials</span>
                    </button>
                    {Object.entries(BRAND_ICONS).map(([key, brand]) => (
                      <button
                        key={key}
                        type="button"
                        className={`icon-preset-btn ${form.logo === key ? 'active' : ''}`}
                        onClick={() => update('logo', key)}
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
                      value={customLogoUrl}
                      onChange={(e) => setCustomLogoUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        if (customLogoUrl.trim()) update('logo', customLogoUrl.trim())
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}

                {logoTab === 'upload' && (
                  <div
                    className="dropzone"
                    style={{ padding: 14 }}
                    onClick={() => logoFileRef.current?.click()}
                  >
                    <span style={{ fontSize: 13 }}>Choose image file for logo</span>
                    <input
                      ref={logoFileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleLogoFileUpload(e.target.files?.[0])}
                    />
                  </div>
                )}
              </div>

              {/* Advanced Settings */}
              <div className="row">
                <div className="field">
                  <label className="label">Type</label>
                  <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                    <option value="totp">TOTP (time-based)</option>
                    <option value="hotp">HOTP (counter-based)</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Digits</label>
                  <select value={form.digits} onChange={(e) => update('digits', +e.target.value)}>
                    <option value={6}>6</option>
                    <option value={7}>7</option>
                    <option value={8}>8</option>
                  </select>
                </div>
              </div>

              {form.type === 'totp' ? (
                <div className="row">
                  <div className="field">
                    <label className="label">Period (s)</label>
                    <input
                      className="input"
                      type="number"
                      min={15}
                      max={60}
                      value={form.period}
                      onChange={(e) => update('period', +e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="label">Algorithm</label>
                    <select
                      value={form.algorithm}
                      onChange={(e) => update('algorithm', e.target.value)}
                    >
                      <option>SHA1</option>
                      <option>SHA256</option>
                      <option>SHA512</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="field">
                  <label className="label">Counter</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.counter}
                    onChange={(e) => update('counter', +e.target.value)}
                  />
                </div>
              )}
            </form>
          )}

          {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            {tab === 'manual' && (
              <button className="btn btn-primary" onClick={submit} disabled={loading}>
                {loading ? 'Saving…' : 'Save Account'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Create Group Modal */}
      {showCreateGroupModal && (
        <GroupModal
          isOpen={showCreateGroupModal}
          onSave={(newName, newLogo) => {
            const created = createCustomGroup(newName, newLogo)
            setCustomGroups(getCustomGroups())
            update('group', created.name)
            setShowCreateGroupModal(false)
          }}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}
    </>
  )
}
