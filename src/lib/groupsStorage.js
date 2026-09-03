import { api } from './api.js'

const GROUPS_STORAGE_KEY = '2fa_vault_custom_groups'
const ACCOUNT_META_KEY = '2fa_vault_account_meta'

// Listeners for multi-component reactive sync
const listeners = new Set()
function notify() {
  listeners.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      console.error(e)
    }
  })
}

export function subscribeGroups(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getCustomGroups() {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.error('Failed to read custom groups from localStorage', e)
  }
  return []
}

export function saveCustomGroups(groups) {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups))
    notify()
  } catch (e) {
    console.error('Failed to save custom groups to localStorage', e)
  }
}

// Merge groups retrieved from database into local cache
export function syncGroupsFromBackend(backendGroups) {
  if (!Array.isArray(backendGroups)) return
  const local = getCustomGroups()
  const map = new Map()
  // 1. Add local groups
  local.forEach((g) => {
    if (g && g.name) map.set(g.name.toLowerCase(), g)
  })
  // 2. Overlay backend groups
  backendGroups.forEach((g) => {
    if (g && g.name) {
      const existing = map.get(g.name.toLowerCase()) || {}
      map.set(g.name.toLowerCase(), {
        ...existing,
        id: g.id || existing.id || ('grp_' + Date.now()),
        name: g.name,
        logo: g.logo || existing.logo || '',
        createdAt: g.created_at || g.createdAt || new Date().toISOString(),
      })
    }
  })
  const merged = Array.from(map.values())
  saveCustomGroups(merged)
  return merged
}

export function createCustomGroup(name, logo = '') {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Group name cannot be empty')
  const groups = getCustomGroups()
  const exists = groups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())
  if (exists) throw new Error(`Group "${trimmed}" already exists`)

  const newGroup = {
    id: 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: trimmed,
    logo: logo || '',
    createdAt: new Date().toISOString(),
  }
  saveCustomGroups([...groups, newGroup])

  // Persist to database in background
  api.createGroup({ id: newGroup.id, name: trimmed, logo }).catch((err) => {
    console.warn('[groupsStorage] Failed to save group to DB:', err?.message)
  })

  return newGroup
}

export function renameCustomGroup(groupId, newName) {
  const trimmed = (newName || '').trim()
  if (!trimmed) throw new Error('Group name cannot be empty')
  const groups = getCustomGroups()
  const target = groups.find((g) => g.id === groupId)
  if (!target) throw new Error('Group not found')

  const duplicate = groups.some(
    (g) => g.id !== groupId && g.name.toLowerCase() === trimmed.toLowerCase()
  )
  if (duplicate) throw new Error(`Group "${trimmed}" already exists`)

  const oldName = target.name
  const updated = groups.map((g) => (g.id === groupId ? { ...g, name: trimmed } : g))
  saveCustomGroups(updated)

  // Also update account metadata mapped to this old group name
  try {
    const meta = getAllAccountMeta()
    let changed = false
    for (const [accId, data] of Object.entries(meta)) {
      if (data.group === oldName || data.groupId === groupId) {
        meta[accId] = { ...data, group: trimmed, groupId }
        changed = true
      }
    }
    if (changed) {
      localStorage.setItem(ACCOUNT_META_KEY, JSON.stringify(meta))
    }
  } catch (e) {
    console.error('Failed to update account meta on group rename', e)
  }

  // Persist rename to database in background
  api.updateGroup(groupId, { name: trimmed }).catch((err) => {
    console.warn('[groupsStorage] Failed to rename group in DB:', err?.message)
  })

  notify()
  return trimmed
}

export function deleteCustomGroup(groupId) {
  const groups = getCustomGroups()
  const target = groups.find((g) => g.id === groupId)
  if (!target) return
  const oldName = target.name

  const updated = groups.filter((g) => g.id !== groupId)
  saveCustomGroups(updated)

  // Clear group assignment from accounts in this group
  try {
    const meta = getAllAccountMeta()
    let changed = false
    for (const [accId, data] of Object.entries(meta)) {
      if (data.group === oldName || data.groupId === groupId) {
        meta[accId] = { ...data, group: '', groupId: '' }
        changed = true
      }
    }
    if (changed) {
      localStorage.setItem(ACCOUNT_META_KEY, JSON.stringify(meta))
    }
  } catch (e) {
    console.error('Failed to clean account meta on group delete', e)
  }

  // Persist delete to database in background
  api.deleteGroup(groupId, oldName).catch((err) => {
    console.warn('[groupsStorage] Failed to delete group from DB:', err?.message)
  })

  notify()
}

// ── Account metadata (Group + Logo per account) ───────────────────────────
export function getAllAccountMeta() {
  try {
    const raw = localStorage.getItem(ACCOUNT_META_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch (e) {
    console.error('Failed to read account metadata', e)
  }
  return {}
}

export function getAccountMeta(accountId) {
  const all = getAllAccountMeta()
  return all[accountId] || { group: '', logo: '' }
}

export function setAccountMeta(accountId, meta) {
  try {
    const all = getAllAccountMeta()
    all[accountId] = {
      ...(all[accountId] || {}),
      ...meta,
    }
    localStorage.setItem(ACCOUNT_META_KEY, JSON.stringify(all))
    notify()
  } catch (e) {
    console.error('Failed to save account metadata', e)
  }
}
