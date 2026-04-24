/**
 * qrUtils.js — QR code generation for patient linking
 * Uses Google Charts API (no library needed, works in browser)
 * QR encodes: mednote://patient/{uid}
 */

export function getPatientQRUrl(uid) {
  const data = `mednote://patient/${uid}`
  const encoded = encodeURIComponent(data)
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}&color=028090&bgcolor=FFFFFF&margin=10`
}

export function parseQRData(text) {
  // Expected: mednote://patient/{uid}
  const match = (text || '').match(/mednote:\/\/patient\/([a-zA-Z0-9]+)/)
  if (match) return { type: 'patient', uid: match[1] }
  // Fallback: plain UID (28 chars alphanumeric — Firebase UID format)
  const plain = (text || '').trim()
  if (/^[a-zA-Z0-9]{20,30}$/.test(plain)) return { type: 'patient', uid: plain }
  return null
}
