import bcrypt from 'bcryptjs'
import {
  deriveKek,
  generateSalt,
  generateVaultKey,
  wrapVaultKey,
  encryptedToBlob,
  fromBase64,
} from './lib/crypto.js'
import {
  getVerifier,
  setVerifier,
  getWrappedKey,
  setWrappedKey,
} from './lib/store.js'
import {
  wrapVaultKeyForSession,
  signSession,
  buildCookie,
  jsonResponse,
  errorResponse,
} from './lib/auth.js'

const BCRYPT_COST = 12

async function initVault(password) {
  const salt = generateSalt()
  const kek = deriveKek(password, salt)
  const vaultKey = generateVaultKey()
  const wrapped = wrapVaultKey(vaultKey, kek)
  const bcryptHash = await bcrypt.hash(password, BCRYPT_COST)
  await setVerifier({
    bcryptHash,
    salt: salt.toString('base64'),
    iterations: 310000,
  })
  await setWrappedKey({
    ...encryptedToBlob(wrapped),
    salt: salt.toString('base64'),
    iterations: 310000,
  })
  return vaultKey
}

async function unlockVault(password) {
  const verifier = await getVerifier()
  const wrapped = await getWrappedKey()
  if (!verifier || !wrapped) return null
  const ok = await bcrypt.compare(password, verifier.bcryptHash)
  if (!ok) return null
  const saltBytes = fromBase64(wrapped.salt)
  const kek = deriveKek(password, saltBytes)
  const { blobToEncrypted, unwrapVaultKey } = await import('./lib/crypto.js')
  const vaultKey = unwrapVaultKey(blobToEncrypted(wrapped), kek)
  const reWrapped = wrapVaultKey(vaultKey, kek)
  await setWrappedKey({
    ...encryptedToBlob(reWrapped),
    salt: wrapped.salt,
    iterations: wrapped.iterations,
  })
  return vaultKey
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed')
  }
  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return errorResponse(400, 'Invalid JSON')
  }
  const { password } = body
  if (!password || typeof password !== 'string' || password.length < 8) {
    return errorResponse(400, 'Password must be at least 8 characters')
  }
  try {
    const verifier = await getVerifier()
    let isInit = false
    let vaultKey
    if (!verifier) {
      vaultKey = await initVault(password)
      isInit = true
    } else {
      vaultKey = await unlockVault(password)
      if (!vaultKey) {
        return errorResponse(401, 'Invalid password')
      }
    }
    const wrappedForSession = wrapVaultKeyForSession(vaultKey)
    const token = signSession(wrappedForSession)
    return jsonResponse(
      200,
      { ok: true, initialized: isInit },
      { 'Set-Cookie': buildCookie(token) }
    )
  } catch (err) {
    console.error('login error', err)
    return errorResponse(500, 'Login failed')
  }
}
