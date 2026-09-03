import { Router } from 'express'
import {
  listGroupsByUser,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../lib/supabase.js'
import { getVaultKeyFromReq, getUserIdFromReq } from '../lib/auth.js'

const router = Router()

// GET /api/groups — fetch all custom groups for authenticated user
router.get('/', async (req, res) => {
  const vaultKey = getVaultKeyFromReq(req)
  const userId = getUserIdFromReq(req)
  if (!vaultKey || !userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const groups = await listGroupsByUser(userId)
    return res.status(200).json({ groups })
  } catch (err) {
    console.error('[groups] list error:', err?.message)
    return res.status(500).json({ error: 'Failed to list groups' })
  }
})

// POST /api/groups — create a new custom group in Supabase
router.post('/', async (req, res) => {
  const vaultKey = getVaultKeyFromReq(req)
  const userId = getUserIdFromReq(req)
  if (!vaultKey || !userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { name, logo = '', id } = req.body || {}
  const trimmed = String(name || '').trim().slice(0, 64)
  if (!trimmed) {
    return res.status(400).json({ error: 'Group name is required' })
  }
  try {
    const group = await createGroup(userId, { id, name: trimmed, logo })
    return res.status(201).json({ group })
  } catch (err) {
    console.error('[groups] create error:', err?.message)
    return res.status(500).json({ error: 'Failed to create group' })
  }
})

// PUT /api/groups/:id — rename or update a custom group
router.put('/:id', async (req, res) => {
  const vaultKey = getVaultKeyFromReq(req)
  const userId = getUserIdFromReq(req)
  if (!vaultKey || !userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { id } = req.params
  const { name, logo } = req.body || {}
  const updates = {}
  if (name !== undefined) updates.name = String(name).trim().slice(0, 64)
  if (logo !== undefined) updates.logo = String(logo).trim().slice(0, 2048)
  try {
    const updated = await updateGroup(userId, id, updates)
    return res.status(200).json({ group: updated })
  } catch (err) {
    console.error('[groups] update error:', err?.message)
    return res.status(500).json({ error: 'Failed to update group' })
  }
})

// DELETE /api/groups/:id — delete custom group
router.delete('/:id', async (req, res) => {
  const vaultKey = getVaultKeyFromReq(req)
  const userId = getUserIdFromReq(req)
  if (!vaultKey || !userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { id } = req.params
  const oldName = req.query.name || req.body?.name || ''
  try {
    await deleteGroup(userId, id, oldName)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[groups] delete error:', err?.message)
    return res.status(500).json({ error: 'Failed to delete group' })
  }
})

export default router
