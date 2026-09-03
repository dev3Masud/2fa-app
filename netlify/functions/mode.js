import { jsonResponse, errorResponse } from './lib/auth.js'
import { getVerifier } from './lib/store.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed')
  }
  const hasAdminPass = !!process.env.ADMIN_PASS
  const verifier = await getVerifier()
  return jsonResponse(200, {
    mode: hasAdminPass ? 'env' : 'auto',
    vaultInitialized: !!verifier,
  })
}
