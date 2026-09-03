import { getStore } from '@netlify/blobs'
import { encryptedToBlob, blobToEncrypted } from './crypto.js'

const STORE_NAME = 'vault'

function store() {
  return getStore(STORE_NAME)
}

const VERIFIER_KEY = 'verifier.json'
const WRAPPED_KEY = 'wrapped.json'
const INDEX_KEY = 'accounts/_index.json'

export async function getVerifier() {
  try {
    return await store().get(VERIFIER_KEY, { type: 'json' })
  } catch {
    return null
  }
}

export async function setVerifier(data) {
  await store().setJSON(VERIFIER_KEY, data)
}

export async function getWrappedKey() {
  try {
    return await store().get(WRAPPED_KEY, { type: 'json' })
  } catch {
    return null
  }
}

export async function setWrappedKey(data) {
  await store().setJSON(WRAPPED_KEY, data)
}

export async function getIndex() {
  try {
    return (await store().get(INDEX_KEY, { type: 'json' })) || []
  } catch {
    return []
  }
}

export async function setIndex(ids) {
  await store().setJSON(INDEX_KEY, ids)
}

export async function addIndexId(id) {
  const ids = await getIndex()
  if (!ids.includes(id)) {
    ids.push(id)
    await setIndex(ids)
  }
}

export async function removeIndexId(id) {
  const ids = await getIndex()
  const next = ids.filter((x) => x !== id)
  await setIndex(next)
}

export async function getAccount(id) {
  const key = `accounts/${id}.json`
  try {
    return await store().get(key, { type: 'json' })
  } catch {
    return null
  }
}

export async function setAccount(id, record) {
  const key = `accounts/${id}.json`
  await store().setJSON(key, record)
}

export async function deleteAccount(id) {
  const key = `accounts/${id}.json`
  await store().delete(key)
}

export async function listAccounts() {
  const ids = await getIndex()
  const items = await Promise.all(ids.map((id) => getAccount(id)))
  return items.filter(Boolean)
}

export function publicAccount(rec) {
  return {
    id: rec.id,
    label: rec.label,
    issuer: rec.issuer,
    type: rec.type,
    digits: rec.digits,
    period: rec.period,
    algorithm: rec.algorithm,
    counter: rec.counter ?? null,
    createdAt: rec.createdAt,
  }
}

export function serializeAccount(rec, encryptedSecret) {
  return {
    ...publicAccount(rec),
    encryptedSecret: encryptedToBlob(encryptedSecret),
  }
}

export function deserializeAccount(rec) {
  return {
    public: publicAccount(rec),
    encryptedSecret: blobToEncrypted(rec.encryptedSecret),
  }
}
