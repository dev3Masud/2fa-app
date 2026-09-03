import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '../lib/api.js'
import AddAccount from '../components/AddAccount.jsx'
import GroupContainer from '../components/GroupContainer.jsx'
import GroupModal from '../components/GroupModal.jsx'
import {
  getCustomGroups,
  createCustomGroup,
  renameCustomGroup,
  deleteCustomGroup,
  subscribeGroups,
  getAllAccountMeta,
} from '../lib/groupsStorage.js'


export default function Dashboard() {
  const [accounts, setAccounts] = useState([])
  const [codes, setCodes] = useState({})
  const [tickerRemaining, setTickerRemaining] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addDefaultGroup, setAddDefaultGroup] = useState('')
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGroupFilter, setActiveGroupFilter] = useState('ALL')
  const [masked, setMasked] = useState(false)
  const [customGroups, setCustomGroups] = useState([])

  const searchInputRef = useRef()

  // Sync custom groups from storage
  useEffect(() => {
    setCustomGroups(getCustomGroups())
    const unsubscribe = subscribeGroups(() => {
      setCustomGroups(getCustomGroups())
    })
    return unsubscribe
  }, [])

  // ── Fetch codes for all accounts ──────────────────────────────────────────
  const fetchAllCodes = useCallback(async (accountList) => {
    if (!accountList || accountList.length === 0) return
    try {
      // 1. Attempt batch code fetch
      const res = await api.getAllCodes()
      if (res && res.codes) {
        setCodes(res.codes)
        return
      }
    } catch (e) {
      // 2. Fallback: fetch individually in parallel
      try {
        const results = await Promise.allSettled(
          accountList.map((a) => api.getCode(a.id))
        )
        const batch = {}
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            batch[accountList[idx].id] = r.value
          }
        })
        setCodes(batch)
      } catch (err) {
        console.error('Failed to fetch TOTP codes', err)
      }
    }
  }, [])

  // ── Load accounts ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await api.listAccounts()
      const meta = getAllAccountMeta()

      // Merge backend accounts with local group/logo metadata if missing
      const merged = (res.accounts || []).map((acc) => {
        const local = meta[acc.id] || {}
        return {
          ...acc,
          group: acc.group || local.group || '',
          logo: acc.logo || local.logo || '',
        }
      })

      // Auto-register any groups from accounts into customGroups if not yet present
      const existingGroups = getCustomGroups()
      const existingNames = new Set(existingGroups.map((g) => g.name.toLowerCase()))
      merged.forEach((a) => {
        if (a.group && !existingNames.has(a.group.toLowerCase())) {
          try {
            createCustomGroup(a.group, a.logo || '')
            existingNames.add(a.group.toLowerCase())
          } catch {
            // ignore duplicates
          }
        }
      })

      setAccounts(merged)
      fetchAllCodes(merged)
    } catch (e) {
      if (e.status === 401) {
        window.location.reload()
      } else {
        setErr(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [fetchAllCodes])

  useEffect(() => {
    load()
  }, [load])

  // ── Precision Epoch-Synchronized Countdown Timer ──────────────────────────
  useEffect(() => {
    if (accounts.length === 0) return

    function tick() {
      const nowSec = Math.floor(Date.now() / 1000)
      const newRemaining = {}
      const needRefresh = []

      accounts.forEach((acc) => {
        if (acc.type === 'hotp') return
        const period = acc.period || 30
        const rem = period - (nowSec % period)
        newRemaining[acc.id] = rem

        // If code just rolled over (remaining === period), refresh code
        if (rem === period) {
          needRefresh.push(acc.id)
        }
      })

      setTickerRemaining(newRemaining)

      // Refresh any expired accounts
      if (needRefresh.length > 0) {
        needRefresh.forEach(async (id) => {
          try {
            const res = await api.getCode(id)
            setCodes((prev) => ({
              ...prev,
              [id]: res,
            }))
          } catch (e) {
            console.error('Failed to refresh code', e)
          }
        })
      }
    }

    tick()
    const timer = setInterval(tick, 1000)

    // Handle tab focus / wake up
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        tick()
        fetchAllCodes(accounts)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [accounts, fetchAllCodes])

  // ── Keyboard shortcut: "/" to focus search ────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Filtering & Grouping Logic ────────────────────────────────────────────
  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return accounts.filter((a) => {
      // 1. Search Query filter
      if (q) {
        const matchLabel = a.label?.toLowerCase().includes(q)
        const matchIssuer = a.issuer?.toLowerCase().includes(q)
        const matchGroup = a.group?.toLowerCase().includes(q)
        if (!matchLabel && !matchIssuer && !matchGroup) return false
      }
      // 2. Active Group Tab filter
      if (activeGroupFilter !== 'ALL') {
        if (activeGroupFilter === 'UNGROUPED') {
          return !a.group
        }
        return (a.group || '').toLowerCase() === activeGroupFilter.toLowerCase()
      }
      return true
    })
  }, [accounts, searchQuery, activeGroupFilter])

  // Group the filtered accounts by group name
  const groupedSections = useMemo(() => {
    const map = new Map()

    // Ensure all custom groups are represented
    customGroups.forEach((g) => {
      map.set(g.name.toLowerCase(), {
        id: g.id,
        name: g.name,
        logo: g.logo,
        accounts: [],
      })
    })

    const ungrouped = []

    filteredAccounts.forEach((acc) => {
      const gName = (acc.group || '').trim()
      if (!gName) {
        ungrouped.push(acc)
      } else {
        const key = gName.toLowerCase()
        if (!map.has(key)) {
          map.set(key, {
            id: 'grp_auto_' + key,
            name: gName,
            logo: acc.logo || '',
            accounts: [acc],
          })
        } else {
          map.get(key).accounts.push(acc)
        }
      }
    })

    const sections = Array.from(map.values())

    // If active filter is set to a specific group, only show that section
    let result = sections
    if (activeGroupFilter !== 'ALL') {
      if (activeGroupFilter === 'UNGROUPED') {
        result = []
      } else {
        result = sections.filter(
          (s) => s.name.toLowerCase() === activeGroupFilter.toLowerCase()
        )
      }
    } else {
      // In "ALL" view, hide empty custom groups if there is a search query
      if (searchQuery.trim()) {
        result = result.filter((s) => s.accounts.length > 0)
      }
    }

    // Add ungrouped section if there are ungrouped accounts
    if (ungrouped.length > 0) {
      if (activeGroupFilter === 'ALL' || activeGroupFilter === 'UNGROUPED') {
        result.push({
          id: 'ungrouped',
          name: 'Ungrouped',
          logo: '',
          accounts: ungrouped,
        })
      }
    }

    return result
  }, [filteredAccounts, customGroups, activeGroupFilter, searchQuery])

  // Count accounts in each group
  const groupCounts = useMemo(() => {
    const counts = { ALL: accounts.length }
    let ungrp = 0
    accounts.forEach((a) => {
      if (!a.group) {
        ungrp++
      } else {
        const k = a.group.toLowerCase()
        counts[k] = (counts[k] || 0) + 1
      }
    })
    counts.UNGROUPED = ungrp
    return counts
  }, [accounts])

  // ── Group Actions ─────────────────────────────────────────────────────────
  function handleRenameGroup(groupId, newName) {
    try {
      renameCustomGroup(groupId, newName)
      // Update accounts in state
      setAccounts((prev) =>
        prev.map((a) => {
          const old = customGroups.find((g) => g.id === groupId)?.name
          if (a.group === old) {
            return { ...a, group: newName }
          }
          return a
        })
      )
    } catch (e) {
      alert(e.message)
    }
  }

  function handleDeleteGroup(groupId) {
    const old = customGroups.find((g) => g.id === groupId)?.name
    deleteCustomGroup(groupId)
    setAccounts((prev) =>
      prev.map((a) => (a.group === old ? { ...a, group: '' } : a))
    )
  }

  function handleAddAccountToGroup(groupName) {
    setAddDefaultGroup(groupName)
    setShowAdd(true)
  }

  function handleAccountDeleted(id) {
    setAccounts((list) => list.filter((x) => x.id !== id))
    setCodes((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function handleAccountUpdated(updated) {
    setAccounts((list) =>
      list.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    )
  }

  async function logout() {
    try {
      await api.logout()
    } catch (e) {
      console.error(e)
    }
    window.location.reload()
  }

  return (
    <div className="app">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="header">
        <div className="logo">
          <div className="vault-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1>2FA Vault</h1>
          <span className="badge">{accounts.length}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Privacy Toggle (Mask/Reveal) */}
          <button
            className={`btn-icon ${masked ? 'active' : ''}`}
            onClick={() => setMasked(!masked)}
            title={masked ? 'Reveal Codes' : 'Mask Codes (Privacy Mode)'}
          >
            {masked ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>

          {/* New Group Button */}
          <button
            className="btn"
            onClick={() => setShowNewGroupModal(true)}
            title="Create a new custom group"
          >
            + Group
          </button>

          {/* Add Account Button */}
          <button
            className="btn btn-primary"
            onClick={() => {
              setAddDefaultGroup(activeGroupFilter !== 'ALL' && activeGroupFilter !== 'UNGROUPED' ? activeGroupFilter : '')
              setShowAdd(true)
            }}
          >
            + Add
          </button>

          {/* Lock Vault Button */}
          <button className="btn" onClick={logout} title="Lock Vault and sign out">
            Lock
          </button>
        </div>
      </div>

      {/* ── Search Bar matching user mockup ───────────────────────── */}
      <div className="search-bar-container">
        <div className="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder="Search by name or issuer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
        <span className="search-kbd-shortcut">/</span>
      </div>

      {/* ── Custom Groups Filter Pills ────────────────────────────── */}
      <div className="groups-filter-bar">
        <button
          className={`group-pill ${activeGroupFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveGroupFilter('ALL')}
        >
          All
          <span className="group-pill-count">{accounts.length}</span>
        </button>

        {customGroups.map((g) => {
          const cnt = groupCounts[g.name.toLowerCase()] || 0
          return (
            <button
              key={g.id}
              className={`group-pill ${activeGroupFilter.toLowerCase() === g.name.toLowerCase() ? 'active' : ''}`}
              onClick={() => setActiveGroupFilter(g.name)}
            >
              {g.name}
              <span className="group-pill-count">{cnt}</span>
            </button>
          )
        })}

        {groupCounts.UNGROUPED > 0 && (
          <button
            className={`group-pill ${activeGroupFilter === 'UNGROUPED' ? 'active' : ''}`}
            onClick={() => setActiveGroupFilter('UNGROUPED')}
          >
            Ungrouped
            <span className="group-pill-count">{groupCounts.UNGROUPED}</span>
          </button>
        )}

        <button
          className="group-pill new-group-pill"
          onClick={() => setShowNewGroupModal(true)}
          title="Create New Group"
        >
          + New Group
        </button>
      </div>

      {err && <div className="error">{err}</div>}

      {/* ── Content View ─────────────────────────────────────────── */}
      {loading ? (
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Loading encrypted vault…
        </div>
      ) : accounts.length === 0 ? (
        <div className="card empty-state-card">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>Your Vault is Empty</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 18px', maxWidth: 360 }}>
            Securely store and generate live two-factor authentication codes for your accounts.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              + Add First Account
            </button>
            <button className="btn" onClick={() => setShowNewGroupModal(true)}>
              + Create a Group
            </button>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="card empty">
          No accounts found matching &ldquo;{searchQuery}&rdquo;.
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          </div>
        </div>
      ) : (
        /* ── Group Sections Container List ─────────────────────── */
        <div className="account-list">
          {groupedSections.map((section) => (
            <GroupContainer
              key={section.id}
              group={section}
              accounts={section.accounts}
              codes={codes}
              tickerRemaining={tickerRemaining}
              masked={masked}
              onDeleteAccount={handleAccountDeleted}
              onUpdateAccount={handleAccountUpdated}
              onRenameGroup={handleRenameGroup}
              onDeleteGroup={handleDeleteGroup}
              onAddAccountToGroup={handleAddAccountToGroup}
            />
          ))}
        </div>
      )}

      {/* ── Add Account Modal ─────────────────────────────────────── */}
      {showAdd && (
        <AddAccount
          defaultGroup={addDefaultGroup}
          onClose={() => {
            setShowAdd(false)
            setAddDefaultGroup('')
          }}
          onCreated={(acc) => {
            setAccounts((list) => [acc, ...list])
            setShowAdd(false)
            setAddDefaultGroup('')
            // Fetch code for newly created account
            api.getCode(acc.id).then((codeData) => {
              setCodes((prev) => ({ ...prev, [acc.id]: codeData }))
            }).catch((e) => console.error(e))
          }}
        />
      )}

      {/* ── Create New Group Modal ────────────────────────────────── */}
      {showNewGroupModal && (
        <GroupModal
          isOpen={showNewGroupModal}
          onSave={(name, logo) => {
            createCustomGroup(name, logo)
            setActiveGroupFilter(name)
            setShowNewGroupModal(false)
          }}
          onClose={() => setShowNewGroupModal(false)}
        />
      )}
    </div>
  )
}
