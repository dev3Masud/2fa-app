import { createClient } from '@supabase/supabase-js'

let _client = null

export function getSupabase() {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env vars.'
    )
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

// ── Test-only in-memory mock ──────────────────────────────────────────────────
const mocks = {}
export function _mock(name, fn) {
  mocks[name] = fn
}

export function publicAccount(row) {
  return {
    id: row.id,
    label: row.label,
    issuer: row.issuer,
    type: row.type,
    digits: row.digits,
    period: row.period,
    algorithm: row.algorithm,
    counter: row.counter ?? 0,
    group: row.group_name || row.group || 'General',
    logo: row.logo || '',
    createdAt: row.created_at,
  }
}

export function serializeAccount(row) {
  return {
    id: row.id,
    label: row.label,
    issuer: row.issuer,
    type: row.type,
    digits: row.digits,
    period: row.period,
    algorithm: row.algorithm,
    counter: row.counter ?? 0,
    group: row.group_name || row.group || 'General',
    logo: row.logo || '',
    createdAt: row.created_at,
    encryptedSecret: {
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.auth_tag,
    },
  }
}


export async function getUserByUsername(username) {
  if (mocks.getUserByUsername) return mocks.getUserByUsername(username)
  const sb = getSupabase()
  const { data, error } = await sb
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createUser(data) {
  if (mocks.createUser) return mocks.createUser(data)
  const sb = getSupabase()
  const { data: row, error } = await sb
    .from('users')
    .insert({
      username: data.username,
      password_hash: data.passwordHash,
      kek_salt: data.kekSalt,
      kek_iterations: data.kekIterations,
      wrapped_vault_key: data.wrappedVaultKey,
      wrapped_vault_iv: data.wrappedVaultIv,
      wrapped_vault_tag: data.wrappedVaultTag,
    })
    .select()
    .single()
  if (error) throw error
  return row
}

export async function updateUserWrappedKey(userId, data) {
  if (mocks.updateUserWrappedKey) return mocks.updateUserWrappedKey(userId, data)
  const sb = getSupabase()
  const { error } = await sb
    .from('users')
    .update({
      wrapped_vault_key: data.wrappedVaultKey,
      wrapped_vault_iv: data.wrappedVaultIv,
      wrapped_vault_tag: data.wrappedVaultTag,
    })
    .eq('id', userId)
  if (error) throw error
}

export async function listAccountsByUser(userId) {
  if (mocks.listAccountsByUser) return mocks.listAccountsByUser(userId)
  const sb = getSupabase()
  const { data, error } = await sb
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAccountById(userId, id) {
  if (mocks.getAccountById) return mocks.getAccountById(userId, id)
  const sb = getSupabase()
  const { data, error } = await sb
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createAccount(userId, rec) {
  if (mocks.createAccount) return mocks.createAccount(userId, rec)
  const sb = getSupabase()
  const basePayload = {
    user_id: userId,
    label: rec.label,
    issuer: rec.issuer,
    type: rec.type,
    digits: rec.digits,
    period: rec.period,
    algorithm: rec.algorithm,
    counter: rec.counter,
    ciphertext: rec.encryptedSecret.ciphertext,
    iv: rec.encryptedSecret.iv,
    auth_tag: rec.encryptedSecret.authTag,
  }

  // Attempt insert with group_name and logo if provided
  try {
    const payloadWithMeta = {
      ...basePayload,
      ...(rec.group_name ? { group_name: rec.group_name } : {}),
      ...(rec.logo ? { logo: rec.logo } : {}),
    }
    const { data, error } = await sb
      .from('accounts')
      .insert(payloadWithMeta)
      .select()
      .single()
    if (!error) return data
    // If column doesn't exist in Supabase yet, retry with base payload
    if (error.message?.includes('column') || error.code === '42703') {
      console.warn('[supabase] group_name/logo columns not yet in DB, inserting base payload')
    } else {
      throw error
    }
  } catch (err) {
    if (!err.message?.includes('column') && err.code !== '42703') throw err
  }

  const { data, error } = await sb
    .from('accounts')
    .insert(basePayload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAccount(userId, id, updates) {
  if (mocks.updateAccount) return mocks.updateAccount(userId, id, updates)
  const sb = getSupabase()
  const payload = {}
  if (updates.label !== undefined) payload.label = updates.label
  if (updates.issuer !== undefined) payload.issuer = updates.issuer
  if (updates.group_name !== undefined) payload.group_name = updates.group_name
  if (updates.logo !== undefined) payload.logo = updates.logo

  const { data, error } = await sb
    .from('accounts')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single()
  if (!error) return data
  if (error.message?.includes('column') || error.code === '42703') {
    // Retry without group_name and logo if columns do not exist
    delete payload.group_name
    delete payload.logo
    if (Object.keys(payload).length > 0) {
      const { data: fallbackData, error: fallbackError } = await sb
        .from('accounts')
        .update(payload)
        .eq('user_id', userId)
        .eq('id', id)
        .select()
        .single()
      if (fallbackError) throw fallbackError
      return fallbackData
    }
    return await getAccountById(userId, id)
  }
  throw error
}


export async function deleteAccountById(userId, id) {
  if (mocks.deleteAccountById) return mocks.deleteAccountById(userId, id)
  const sb = getSupabase()
  const { error } = await sb
    .from('accounts')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

