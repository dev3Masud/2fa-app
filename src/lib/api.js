async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
      : { ...(options.headers || {}) },
    ...options,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { error: text }
  }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  getMode() {
    return request('/api/mode')
  },
  login(password) {
    return request('/api/login', { method: 'POST', body: JSON.stringify({ password }) })
  },
  logout() {
    return request('/api/logout', { method: 'POST' })
  },
  listAccounts() {
    return request('/api/accounts')
  },
  createAccount(data) {
    return request('/api/accounts', { method: 'POST', body: JSON.stringify(data) })
  },
  deleteAccount(id) {
    return request(`/api/accounts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  getCode(id, counter) {
    const q = counter != null ? `&counter=${counter}` : ''
    return request(`/api/totp?id=${encodeURIComponent(id)}${q}`)
  },
  parseQr(dataUri) {
    return request('/api/qr-parse', { method: 'POST', body: JSON.stringify({ dataUri }) })
  },
  parseUri(uri) {
    return request('/api/qr-parse', { method: 'POST', body: JSON.stringify({ uri }) })
  },
}
