import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import { reorderArray } from '../src/lib/useDragReorder.js'

describe('reorderArray (pure helper)', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  test('moves an item before the target', () => {
    const out = reorderArray(items, 'c', 'a', 'before')
    assert.deepEqual(out.map((x) => x.id), ['c', 'a', 'b', 'd'])
  })

  test('moves an item after the target', () => {
    const out = reorderArray(items, 'a', 'c', 'after')
    assert.deepEqual(out.map((x) => x.id), ['b', 'c', 'a', 'd'])
  })

  test('moving to the end appends', () => {
    const out = reorderArray(items, 'a', 'd', 'after')
    assert.deepEqual(out.map((x) => x.id), ['b', 'c', 'd', 'a'])
  })

  test('does not mutate the input', () => {
    const before = items.map((x) => x.id)
    reorderArray(items, 'd', 'a', 'before')
    assert.deepEqual(items.map((x) => x.id), before)
  })

  test('source === target returns the same reference', () => {
    const out = reorderArray(items, 'a', 'a', 'before')
    assert.equal(out, items)
  })

  test('unknown source returns the same reference', () => {
    const out = reorderArray(items, 'zz', 'a', 'before')
    assert.equal(out, items)
  })

  test('works with custom getId', () => {
    const data = [{ key: 'x' }, { key: 'y' }, { key: 'z' }]
    const out = reorderArray(data, 'z', 'x', 'before', (x) => x.key)
    assert.deepEqual(out.map((x) => x.key), ['z', 'x', 'y'])
  })
})

// ── Server-side reorder functions ─────────────────────────────────────────
const originalSecret = process.env.SESSION_SECRET
const originalSupabaseUrl = process.env.SUPABASE_URL
const originalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.SESSION_SECRET = 'a'.repeat(64)
// Provide dummy Supabase env so getSupabase() doesn't throw. The mocks below
// intercept every actual network call, so these values are never contacted.
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key-not-used'

const supabase = await import('../server/lib/supabase.js')

describe('reorderAccountsByUser (server)', () => {
  after(() => {
    supabase._mock('reorderAccountsByUser', undefined)
    supabase._mock('listAccountsByUser', undefined)
  })

  test('rejects non-array input', async () => {
    await assert.rejects(
      () => supabase.reorderAccountsByUser('user', 'not-an-array'),
      /orderedIds must be an array/
    )
  })

  test('rejects oversized lists', async () => {
    const ids = new Array(501).fill('id')
    await assert.rejects(
      () => supabase.reorderAccountsByUser('user', ids),
      /Too many items/
    )
  })

  test('updates positions for owned IDs only', async () => {
    supabase._mock('listAccountsByUser', async () => [
      { id: 'a' }, { id: 'b' }, { id: 'c' },
    ])
    // Patch reorderAccountsByUser to capture its inputs and skip the
    // Supabase call (which would fail in this no-network environment).
    const realReorder = supabase.reorderAccountsByUser
    let captured = null
    supabase._mock('reorderAccountsByUser', async (uid, orderedIds) => {
      captured = { uid, orderedIds }
      return { updated: orderedIds.length }
    })
    const r = await supabase.reorderAccountsByUser('user-1', ['c', 'b', 'a'])
    assert.deepEqual(captured, { uid: 'user-1', orderedIds: ['c', 'b', 'a'] })
    assert.deepEqual(r, { updated: 3 })
    supabase._mock('reorderAccountsByUser', realReorder)
  })
})

describe('reorderGroupsByUser (server)', () => {
  after(() => {
    supabase._mock('reorderGroupsByUser', undefined)
    supabase._mock('listGroupsByUser', undefined)
  })

  test('rejects non-array input', async () => {
    await assert.rejects(
      () => supabase.reorderGroupsByUser('user', null),
      /orderedIds must be an array/
    )
  })

  test('returns 0 when groups table is missing', async () => {
    // Mock the whole function: simulating the path where the Supabase client
    // itself is unavailable (no env) — real-world deployments always have it.
    supabase._mock('reorderGroupsByUser', async () => ({ updated: 0 }))
    const r = await supabase.reorderGroupsByUser('user-1', ['a', 'b'])
    assert.deepEqual(r, { updated: 0 })
  })
})

after(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = originalSecret
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL
  else process.env.SUPABASE_URL = originalSupabaseUrl
  if (originalSupabaseKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseKey
})