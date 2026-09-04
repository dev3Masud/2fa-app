import { useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faMagnifyingGlass, faImage } from '@fortawesome/free-solid-svg-icons'
import { BRAND_ICONS, ICON_CATEGORIES, ServiceLogo } from '../lib/icons.jsx'

export default function IconPickerModal({
  isOpen,
  currentLogo = '',
  issuer = '',
  label = '',
  onSelect,
  onClose,
}) {
  const [tab, setTab] = useState('presets') // presets | url | upload
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [customUrl, setCustomUrl] = useState('')
  const fileRef = useRef()

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase()
    return Object.entries(BRAND_ICONS).filter(([key, brand]) => {
      // Category filter
      if (category !== 'All' && brand.category !== category) {
        return false
      }
      // Search filter
      if (q) {
        const matchName = brand.name.toLowerCase().includes(q)
        const matchKey = key.toLowerCase().includes(q)
        if (!matchName && !matchKey) return false
      }
      return true
    })
  }, [search, category])

  if (!isOpen) return null

  function handleFileUpload(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onSelect(reader.result)
      onClose()
    }
    reader.readAsDataURL(file)
  }

  const modalContent = (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal icon-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Choose Account Icon</h2>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{ width: 28, height: 28 }}
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Picker Mode Tabs */}
        <div className="tabs" style={{ margin: '4px 0 10px' }}>
          <button
            className={`tab ${tab === 'presets' ? 'active' : ''}`}
            onClick={() => setTab('presets')}
          >
            Brand Icons ({Object.keys(BRAND_ICONS).length})
          </button>
          <button
            className={`tab ${tab === 'url' ? 'active' : ''}`}
            onClick={() => setTab('url')}
          >
            Image URL
          </button>
          <button
            className={`tab ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => setTab('upload')}
          >
            Upload File
          </button>
        </div>

        {/* Presets Tab */}
        {tab === 'presets' && (
          <>
            {/* Search Input */}
            <div className="icon-search-box">
              <div className="icon-search-icon">
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 15 }} />
              </div>
              <input
                type="text"
                placeholder="Search 70+ icons (e.g. GitHub, Google, AWS, Binance...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Category Filter Pills */}
            <div className="icon-categories-bar">
              {ICON_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`icon-category-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Icons Grid with sleek scrollbar */}
            <div className="icon-grid-scroll">
              <div className="icon-grid-large">
                {/* Auto / Initials Monogram Option */}
                <button
                  type="button"
                  className={`icon-item-card ${!currentLogo ? 'selected' : ''}`}
                  onClick={() => {
                    onSelect('')
                    onClose()
                  }}
                  title="Use automatic monogram initials"
                >
                  <ServiceLogo logo="" issuer={issuer} label={label} size={24} />
                  <span>Auto Initials</span>
                </button>

                {filteredIcons.map(([key, brand]) => (
                  <button
                    key={key}
                    type="button"
                    className={`icon-item-card ${currentLogo === key ? 'selected' : ''}`}
                    onClick={() => {
                      onSelect(key)
                      onClose()
                    }}
                    title={brand.name}
                  >
                    <ServiceLogo logo={key} size={24} />
                    <span>{brand.name}</span>
                  </button>
                ))}
              </div>

              {filteredIcons.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0', fontSize: 13 }}>
                  No icons found for &ldquo;{search}&rdquo;
                </div>
              )}
            </div>
          </>
        )}

        {/* Custom URL Tab */}
        {tab === 'url' && (
          <div style={{ padding: '8px 0' }}>
            <div className="field">
              <label className="label">Logo Image URL</label>
              <input
                className="input"
                placeholder="https://example.com/logo.png"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                autoFocus
              />
            </div>
            {customUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
                <ServiceLogo logo={customUrl} size={40} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Preview</span>
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!customUrl.trim()}
              onClick={() => {
                onSelect(customUrl.trim())
                onClose()
              }}
            >
              Use this Image URL
            </button>
          </div>
        )}

        {/* File Upload Tab */}
        {tab === 'upload' && (
          <div style={{ padding: '8px 0' }}>
            <div
              className="dropzone"
              onClick={() => fileRef.current?.click()}
            >
              <div style={{ marginBottom: 6 }}>
                <FontAwesomeIcon icon={faImage} style={{ fontSize: 28, color: 'var(--muted)' }} />
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Choose an image file
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                PNG, SVG, JPG, WebP supported
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
