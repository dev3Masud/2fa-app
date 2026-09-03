import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { errorResponse, jsonResponse, getVaultKeyFromEvent } from './lib/auth.js'

function parseOtpAuth(uri) {
  if (!uri || !uri.startsWith('otpauth://')) {
    throw new Error('Not an otpauth URI')
  }
  const url = new URL(uri)
  const type = url.host === 'hotp' ? 'hotp' : 'totp'
  const label = decodeURIComponent(url.pathname.slice(1))
  const params = url.searchParams
  const secret = (params.get('secret') || '').replace(/\s+/g, '').toUpperCase()
  if (!secret) throw new Error('No secret in URI')
  let issuer = params.get('issuer') || ''
  const digits = params.get('digits') ? parseInt(params.get('digits'), 10) : 6
  const period = params.get('period') ? parseInt(params.get('period'), 10) : 30
  const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase()
  const counter = params.get('counter') ? parseInt(params.get('counter'), 10) : 0
  let accountLabel = label
  if (label.includes(':')) {
    const [issPart, accPart] = label.split(':', 2)
    if (!issuer) issuer = issPart.trim()
    accountLabel = accPart.trim()
  } else if (label.includes(' - ')) {
    const [issPart, accPart] = label.split(' - ', 2)
    if (!issuer) issuer = issPart.trim()
    accountLabel = accPart.trim()
  }
  return {
    label: accountLabel,
    issuer,
    secret,
    type,
    digits,
    period,
    algorithm,
    counter,
  }
}

function readPngPixels(base64) {
  const buf = Buffer.from(base64, 'base64')
  return new Promise((resolve, reject) => {
    new PNG().parse(buf, (err, data) => {
      if (err) return reject(err)
      resolve(data)
    })
  })
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed')
  }
  const vaultKey = getVaultKeyFromEvent(event)
  if (!vaultKey) return errorResponse(401, 'Unauthorized')

  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || ''
  let dataUri = null
  let uri = null

  if (contentType.includes('application/json')) {
    try {
      const body = JSON.parse(event.body || '{}')
      dataUri = body.dataUri || null
      uri = body.uri || null
    } catch {
      return errorResponse(400, 'Invalid JSON')
    }
  } else if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
    const b64 = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8').toString('base64')
    dataUri = `data:image/png;base64,${b64}`
  } else {
    try {
      const body = JSON.parse(event.body || '{}')
      dataUri = body.dataUri || null
      uri = body.uri || null
    } catch {
      // ignore
    }
  }

  if (uri) {
    try {
      const parsed = parseOtpAuth(uri)
      return jsonResponse(200, { data: parsed })
    } catch (e) {
      return errorResponse(400, e.message)
    }
  }

  if (!dataUri) {
    return errorResponse(400, 'Provide dataUri or uri')
  }

  const match = dataUri.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
  if (!match) {
    return errorResponse(400, 'Only PNG/JPEG data URIs supported for image upload')
  }
  const mime = match[1]
  const b64 = match[2]

  let imageData
  if (mime === 'png') {
    try {
      imageData = await readPngPixels(b64)
    } catch (e) {
      return errorResponse(400, 'Failed to decode PNG')
    }
  } else {
    return errorResponse(400, 'JPEG support requires canvas; please use PNG or paste the otpauth URI instead')
  }
  if (!imageData) {
    return errorResponse(400, 'PNG decoder not available')
  }

  const code = jsQR(
    new Uint8ClampedArray(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength),
    imageData.width,
    imageData.height
  )
  if (!code) return errorResponse(400, 'No QR code detected in image')

  try {
    const parsed = parseOtpAuth(code.data)
    return jsonResponse(200, { data: parsed })
  } catch (e) {
    return errorResponse(400, e.message)
  }
}
