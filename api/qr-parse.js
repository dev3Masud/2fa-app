import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { getVaultKeyFromEvent } from './lib/auth.js'

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

function getBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const vaultKey = getVaultKeyFromEvent(req)
  if (!vaultKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = getBody(req)
  const dataUri = body.dataUri || null
  const uri = body.uri || null

  if (uri) {
    try {
      const parsed = parseOtpAuth(uri)
      return res.status(200).json({ data: parsed })
    } catch (e) {
      return res.status(400).json({ error: e.message })
    }
  }

  if (!dataUri) {
    return res.status(400).json({ error: 'Provide dataUri or uri' })
  }

  const match = dataUri.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
  if (!match) {
    return res.status(400).json({ error: 'Only PNG/JPEG data URIs supported for image upload' })
  }
  const mime = match[1]
  const b64 = match[2]

  let imageData
  if (mime === 'png') {
    try {
      imageData = await readPngPixels(b64)
    } catch {
      return res.status(400).json({ error: 'Failed to decode PNG' })
    }
  } else {
    return res.status(400).json({ error: 'JPEG support requires canvas; please use PNG or paste the otpauth URI instead' })
  }
  if (!imageData) {
    return res.status(400).json({ error: 'PNG decoder not available' })
  }

  const code = jsQR(
    new Uint8ClampedArray(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength),
    imageData.width,
    imageData.height
  )
  if (!code) return res.status(400).json({ error: 'No QR code detected in image' })

  try {
    const parsed = parseOtpAuth(code.data)
    return res.status(200).json({ data: parsed })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
}
