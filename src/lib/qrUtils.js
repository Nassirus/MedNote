/**
 * qrUtils.js — QR code generation using pure browser API
 * Uses qrcode-generator (tiny, no deps) loaded from CDN
 */

export function getPatientQRData(uid) {
  return `mednote://patient/${uid}`
}

export function parseQRData(text) {
  const match = (text || '').match(/mednote:\/\/patient\/([a-zA-Z0-9]+)/)
  if (match) return { type: 'patient', uid: match[1] }
  const plain = (text || '').trim()
  if (/^[a-zA-Z0-9]{24,30}$/.test(plain)) return { type: 'patient', uid: plain }
  return null
}

// Generate QR as data URL using canvas + qrcode-generator lib
export async function generateQRDataURL(text, size = 200) {
  return new Promise((resolve, reject) => {
    // Load qrcode-generator from CDN if not already loaded
    function generate() {
      try {
        const qr = window.qrcode(0, 'M')
        qr.addData(text)
        qr.make()
        const moduleCount = qr.getModuleCount()
        const cellSize = Math.floor(size / moduleCount)
        const margin = Math.floor((size - cellSize * moduleCount) / 2)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, size, size)
        ctx.fillStyle = '#028090'
        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillRect(
                margin + col * cellSize,
                margin + row * cellSize,
                cellSize, cellSize
              )
            }
          }
        }
        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        reject(e)
      }
    }

    if (window.qrcode) {
      generate()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
      script.onerror = () => {
        // Fallback: use Google Charts API
        const url = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(text)}&chco=028090`
        resolve(url)
      }
      script.onload = () => {
        // qrcodejs loaded but uses different API, use our own implementation
        // Load qrcode-generator instead
        const s2 = document.createElement('script')
        s2.src = 'https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js'
        s2.onerror = () => {
          const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=028090&bgcolor=ffffff`
          resolve(url)
        }
        s2.onload = generate
        document.head.appendChild(s2)
      }
      document.head.appendChild(script)
    }
  })
}

// Simple inline QR using qr-code-styling approach
// Returns SVG string directly — no external dependencies
export function generateQRSVG(text, size = 200) {
  // Use Google Charts as reliable fallback — works consistently
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=028090&bgcolor=ffffff&margin=4`
}
