import crypto from 'node:crypto'

const PBKDF2_ITERATIONS = 310000
const PBKDF2_KEYLEN = 32
const PBKDF2_DIGEST = 'sha256'
const SALT_BYTES = 16
const IV_BYTES = 12
const KEY_BYTES = 32

export function randomBytes(n) {
  return crypto.randomBytes(n)
}

export function toHex(buf) {
  return buf.toString('hex')
}

export function fromHex(hex) {
  return Buffer.from(hex, 'hex')
}

export function toBase64(buf) {
  return buf.toString('base64')
}

export function fromBase64(b64) {
  return Buffer.from(b64, 'base64')
}

// ── M4 FIX: Async PBKDF2 — no longer blocks the event loop ───────────────────
export function deriveKek(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST,
      (err, key) => (err ? reject(err) : resolve(key))
    )
  })
}

export function generateVaultKey() {
  return randomBytes(KEY_BYTES)
}

export function generateSalt() {
  return randomBytes(SALT_BYTES)
}

export function generateIv() {
  return randomBytes(IV_BYTES)
}

export function wrapVaultKey(vaultKey, kek) {
  const iv = generateIv()
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv)
  const ciphertext = Buffer.concat([cipher.update(vaultKey), cipher.final()])
  const authTag = cipher.getAuthTag()
  return { ciphertext, iv, authTag }
}

export function unwrapVaultKey({ ciphertext, iv, authTag }, kek) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', kek, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export function encryptSecret(secret, vaultKey) {
  const iv = generateIv()
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey, iv)
  const data = Buffer.from(secret, 'utf8')
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()
  return { ciphertext, iv, authTag }
}

export function decryptSecret({ ciphertext, iv, authTag }, vaultKey) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey, iv)
  decipher.setAuthTag(authTag)
  const data = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return data.toString('utf8')
}

export function encryptedToBlob({ ciphertext, iv, authTag }) {
  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
    authTag: toBase64(authTag),
  }
}

export function blobToEncrypted({ ciphertext, iv, authTag }) {
  return {
    ciphertext: fromBase64(ciphertext),
    iv: fromBase64(iv),
    authTag: fromBase64(authTag),
  }
}
