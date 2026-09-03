import { buildClearCookie, jsonResponse } from './lib/auth.js'

export async function handler() {
  return jsonResponse(200, { ok: true }, { 'Set-Cookie': buildClearCookie() })
}
