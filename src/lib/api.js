async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers:
      options.body && !(options.body instanceof FormData)
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
  login(username, password) {
    return request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  logout() {
    return request('/api/logout', { method: 'POST' })
  },
  listAccounts() {
    return request('/api/accounts')
  },
  createAccount(data) {
    return request('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  // Updated: DELETE now uses REST path param /api/accounts/:id
  deleteAccount(id) {
    return request(`/api/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  // PATCH /api/accounts/:id
  updateAccount(id, data) {
    return request(`/api/accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
  // Updated: GET now uses REST path param /api/totp/:id
  getCode(id, counter) {
    const q = counter != null ? `?counter=${counter}` : ''
    return request(`/api/totp/${encodeURIComponent(id)}${q}`)
  },
  // GET /api/totp — batch fetch all live codes
  getAllCodes() {
    return request('/api/totp')
  },
  parseQr(dataUri) {
    return request('/api/qr-parse', {
      method: 'POST',
      body: JSON.stringify({ dataUri }),
    })
  },
  parseUri(uri) {
    return request('/api/qr-parse', {
      method: 'POST',
      body: JSON.stringify({ uri }),
    })
  },
  // ── Groups API ──
  listGroups() {
    return request('/api/groups')
  },
  createGroup(data) {
    return request('/api/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  updateGroup(id, data) {
    return request(`/api/groups/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  deleteGroup(id, name) {
    const q = name ? `?name=${encodeURIComponent(name)}` : ''
    return request(`/api/groups/${encodeURIComponent(id)}${q}`, {
      method: 'DELETE',
    })
  },
}

