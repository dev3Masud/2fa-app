import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode, faPlus } from '@fortawesome/free-solid-svg-icons'
import jsQR from 'jsqr'
import { api } from '../lib/api.js'
import { BRAND_ICONS, ServiceLogo, detectService } from '../lib/icons.jsx'
import { getCustomGroups, createCustomGroup, setAccountMeta } from '../lib/groupsStorage.js'
import GroupModal from './GroupModal.jsx'
import IconPickerModal from './IconPickerModal.jsx'

export default function AddAccount({ onClose, onCreated, defaultGroup = '' }) {
  const [tab, setTab] = useState('qr')
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

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

  // Icon picker popup modal
  const [showIconPicker, setShowIconPicker] = useState(false)

  // Custom Groups state
  const [customGroups, setCustomGroups] = useState([])
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)

  useEffect(() => {
    setCustomGroups(getCustomGroups())
  }, [])

  function update(k, v) {
    setForm((f) => {
      const next = { ...f, [k]: v }
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
      let qrContent
      try {
        qrContent = await decodeQrClientSide(file)
      } catch (clientErr) {
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

  const modal = (
    <>
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
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
                <FontAwesomeIcon icon={faQrcode} style={{ fontSize: 36, color: 'var(--muted)' }} />
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
              {/* Account Icon Trigger via Popup Modal */}
              <div className="field" style={{ marginBottom: 16 }}>
                <label className="label">Icon / Logo</label>
                <div
                  className="icon-picker-trigger"
                  onClick={() => setShowIconPicker(true)}
                >
                  <div className="icon-picker-trigger-left">
                    <ServiceLogo
                      logo={form.logo}
                      issuer={form.issuer}
                      label={form.label}
                      size={40}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {form.logo && BRAND_ICONS[form.logo]
                          ? BRAND_ICONS[form.logo].name
                          : form.logo
                          ? 'Custom Logo'
                          : 'Auto / Initials'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Click to choose from 70+ logos or upload
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn btn-sm">
                    Choose Icon
                  </button>
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
                    placeholder="e.g. GitHub, Google, AWS"
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
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 11 }} /> Create New Group
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

              {/* ── All Types & All Algorithms ──────────────────────── */}
              <div className="row">
                <div className="field">
                  <label className="label">Type</label>
                  <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                    <option value="totp">TOTP (Time-based, RFC 6238)</option>
                    <option value="hotp">HOTP (Counter-based, RFC 4226)</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Digits</label>
                  <select value={form.digits} onChange={(e) => update('digits', +e.target.value)}>
                    <option value={6}>6 Digits (Standard)</option>
                    <option value={7}>7 Digits</option>
                    <option value={8}>8 Digits</option>
                  </select>
                </div>
              </div>

              {form.type === 'totp' ? (
                <div className="row">
                  <div className="field">
                    <label className="label">Period (Seconds)</label>
                    <select
                      className="input"
                      value={form.period}
                      onChange={(e) => update('period', +e.target.value)}
                    >
                      <option value={15}>15 Seconds</option>
                      <option value={30}>30 Seconds (Default)</option>
                      <option value={45}>45 Seconds</option>
                      <option value={60}>60 Seconds</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Algorithm</label>
                    <select
                      className="input"
                      value={form.algorithm}
                      onChange={(e) => update('algorithm', e.target.value)}
                    >
                      <option value="SHA1">SHA1 (Default / Most Common)</option>
                      <option value="SHA256">SHA256 (HMAC-SHA-256)</option>
                      <option value="SHA512">SHA512 (HMAC-SHA-512)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="row">
                  <div className="field">
                    <label className="label">Initial Counter Value</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={form.counter}
                      onChange={(e) => update('counter', +e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="label">Algorithm</label>
                    <select
                      className="input"
                      value={form.algorithm}
                      onChange={(e) => update('algorithm', e.target.value)}
                    >
                      <option value="SHA1">SHA1 (Default)</option>
                      <option value="SHA256">SHA256</option>
                      <option value="SHA512">SHA512</option>
                    </select>
                  </div>
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

      {/* Icon Picker Popup Modal */}
      <IconPickerModal
        isOpen={showIconPicker}
        currentLogo={form.logo}
        issuer={form.issuer}
        label={form.label}
        onSelect={(newLogo) => update('logo', newLogo)}
        onClose={() => setShowIconPicker(false)}
      />

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

  return createPortal(modal, document.body)
}
