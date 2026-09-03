import { useState, useRef } from 'react'
import { api } from '../lib/api.js'

export default function AddAccount({ onClose, onCreated }) {
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
  })
  const [uri, setUri] = useState('')

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function readFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr('Please choose an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUri = reader.result
      try {
        setLoading(true)
        const res = await api.parseQr(dataUri)
        setForm((f) => ({
          ...f,
          label: res.data.label || f.label,
          issuer: res.data.issuer || f.issuer,
          secret: res.data.secret,
          type: res.data.type,
          digits: res.data.digits,
          period: res.data.period,
          algorithm: res.data.algorithm,
          counter: res.data.counter || 0,
        }))
        setTab('manual')
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function parseUriNow() {
    if (!uri.trim()) return
    setErr('')
    try {
      setLoading(true)
      const res = await api.parseUri(uri.trim())
      setForm((f) => ({
        ...f,
        label: res.data.label || f.label,
        issuer: res.data.issuer || f.issuer,
        secret: res.data.secret,
        type: res.data.type,
        digits: res.data.digits,
        period: res.data.period,
        algorithm: res.data.algorithm,
        counter: res.data.counter || 0,
      }))
      setTab('manual')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
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
      const payload = { ...form }
      if (form.type === 'totp') delete payload.counter
      const res = await api.createAccount(payload)
      onCreated(res.account)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add account</h2>
        <div className="tabs">
          <button className={`tab ${tab === 'qr' ? 'active' : ''}`} onClick={() => setTab('qr')}>
            Upload QR
          </button>
          <button className={`tab ${tab === 'uri' ? 'active' : ''}`} onClick={() => setTab('uri')}>
            Paste URI
          </button>
          <button className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
            Manual
          </button>
        </div>

        {tab === 'qr' && (
          <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              readFile(e.dataTransfer.files?.[0])
            }}
          >
            {loading ? 'Reading QR…' : 'Drop QR image here or click to browse'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => readFile(e.target.files?.[0])}
            />
          </div>
        )}

        {tab === 'uri' && (
          <div className="field">
            <label className="label">otpauth:// URI</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
            />
            <button className="btn" style={{ marginTop: 10 }} onClick={parseUriNow} disabled={loading || !uri.trim()}>
              Parse
            </button>
          </div>
        )}

        {tab === 'manual' && (
          <form onSubmit={submit}>
            <div className="row">
              <div className="field">
                <label className="label">Label *</label>
                <input className="input" value={form.label} onChange={(e) => update('label', e.target.value)} required />
              </div>
              <div className="field">
                <label className="label">Issuer</label>
                <input className="input" value={form.issuer} onChange={(e) => update('issuer', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="label">Secret (base32) *</label>
              <input
                className="input"
                value={form.secret}
                onChange={(e) => update('secret', e.target.value)}
                placeholder="JBSWY3DPEHPK3PXP"
                required
                style={{ fontFamily: 'monospace' }}
              />
            </div>
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
                  <input className="input" type="number" min={15} max={60} value={form.period} onChange={(e) => update('period', +e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Algorithm</label>
                  <select value={form.algorithm} onChange={(e) => update('algorithm', e.target.value)}>
                    <option>SHA1</option>
                    <option>SHA256</option>
                    <option>SHA512</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="field">
                <label className="label">Counter</label>
                <input className="input" type="number" min={0} value={form.counter} onChange={(e) => update('counter', +e.target.value)} />
              </div>
            )}
          </form>
        )}

        {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {tab === 'manual' && (
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
