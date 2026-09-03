import bcrypt from 'bcryptjs'
import {
  deriveKek,
  generateSalt,
  generateVaultKey,
  wrapVaultKey,
  encryptedToBlob,
  fromBase64,
  blobToEncrypted,
  unwrapVaultKey,
} from './crypto.js'
import { getUserByUsername, createUser, updateUserWrappedKey } from './supabase.js'

const BCRYPT_COST = 12
const PBKDF2_ITERATIONS = 310000

// ── L2 FIX: Minimum ADMIN_PASS length raised to 16 ───────────────────────────
const ADMIN_PASS_MIN_LEN = 16

function getAdminUser() {
  return process.env.ADMIN_USER || null
}

function getAdminPass() {
  return process.env.ADMIN_PASS || null
}

export function checkConfig() {
  const user = getAdminUser()
  const pass = getAdminPass()
  const missing = []
  if (!user) missing.push('ADMIN_USER')
  if (!pass) missing.push('ADMIN_PASS')
  if (missing.length) {
    return {
      ok: false,
      message: `Missing required env vars: ${missing.join(', ')}`,
    }
  }
  if (pass.length < ADMIN_PASS_MIN_LEN) {
    return {
      ok: false,
      message: `ADMIN_PASS must be at least ${ADMIN_PASS_MIN_LEN} characters`,
    }
  }
  return { ok: true, username: user }
}

export async function buildWrappedKeyForUser(vaultKey, password) {
  const salt = generateSalt()
  const kek = await deriveKek(password, salt)
  const wrapped = wrapVaultKey(vaultKey, kek)
  return {
    wrappedBlob: encryptedToBlob(wrapped),
    kekSalt: salt.toString('base64'),
    kekIterations: PBKDF2_ITERATIONS,
  }
}

export async function bootstrapUser(username, password) {
  const existing = await getUserByUsername(username)
  if (existing) return { error: { status: 409, message: 'User already exists' } }
  const bcryptHash = await bcrypt.hash(password, BCRYPT_COST)
  const vaultKey = generateVaultKey()
  const { wrappedBlob, kekSalt, kekIterations } = await buildWrappedKeyForUser(vaultKey, password)
  const user = await createUser({
    username,
    passwordHash: bcryptHash,
    kekSalt,
    kekIterations,
    wrappedVaultKey: wrappedBlob.ciphertext,
    wrappedVaultIv: wrappedBlob.iv,
    wrappedVaultTag: wrappedBlob.authTag,
  })
  return { user, vaultKey }
}

export async function authenticateAndUnlock(username, password) {
  const user = await getUserByUsername(username)
  if (!user) return { error: { status: 401, message: 'Invalid credentials' } }
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return { error: { status: 401, message: 'Invalid credentials' } }
  const saltBytes = fromBase64(user.kek_salt)
  const kek = await deriveKek(password, saltBytes)
  let vaultKey
  try {
    vaultKey = unwrapVaultKey(
      blobToEncrypted({
        ciphertext: user.wrapped_vault_key,
        iv: user.wrapped_vault_iv,
        authTag: user.wrapped_vault_tag,
      }),
      kek
    )
  } catch {
    return { error: { status: 500, message: 'Vault unlock failed' } }
  }
  // Re-wrap on each successful login
  const reWrap = wrapVaultKey(vaultKey, kek)
  const reBlob = encryptedToBlob(reWrap)
  await updateUserWrappedKey(user.id, {
    wrappedVaultKey: reBlob.ciphertext,
    wrappedVaultIv: reBlob.iv,
    wrappedVaultTag: reBlob.authTag,
  })
  return { user, vaultKey }
}
