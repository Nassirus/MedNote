/**
 * geminiClient.js — calls Gemini directly from browser
 * Bypasses Vercel 10s timeout completely.
 * Browser → Gemini API (no server involved)
 *
 * Setup: add VITE_GEMINI_API_KEY to Vercel env vars (same key as GEMINI_API_KEY)
 */

const CLIENT_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const API_BASE   = 'https://generativelanguage.googleapis.com/v1beta/models'

const MODELS = [
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
  'gemini-2.0-flash-lite',
]

function buildPrompt(lang) {
  const ru = lang !== 'kk'
  return (
    'List ALL medical instructions from this document as JSON array.\n' +
    'Include: medications, procedures, exercises, diet, restrictions, appointments - everything.\n' +
    (ru
      ? 'Write title, dose, notes IN RUSSIAN.\n'
      : 'Write title, dose, notes IN KAZAKH.\n') +
    'Format: [{"type":"medication|exercise|procedure|appointment|restriction|nutrition",' +
    '"title":"name","dose":"dosage or null","times_per_day":1,"first_time":"HH:MM or null",' +
    '"duration_days":null,"is_one_time":false,"notes":"note or null"}]\n' +
    'If document is unreadable: [{"type":"medication","title":"Document unreadable","dose":null,"times_per_day":1,"first_time":"08:00","duration_days":null,"is_one_time":false,"notes":"Please enter manually"}]\n' +
    'Reply with JSON array ONLY, no explanations.'
  )
}

function buildTimeSlots(firstTime, n) {
  if (n === 1) return [firstTime || '08:00']
  const preset = {
    2: ['08:00', '20:00'],
    3: ['08:00', '14:00', '20:00'],
    4: ['08:00', '12:00', '16:00', '20:00'],
    5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
    6: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
  }
  return preset[n] || [firstTime || '08:00']
}

function normalizeItem(item) {
  const n = Math.max(1, Math.min(6, parseInt(item.times_per_day) || 1))
  return {
    type:          item.type          || 'routine',
    title:         (item.title        || 'Назначение').trim().slice(0, 60),
    dose:          item.dose          || null,
    duration_days: item.duration_days ? parseInt(item.duration_days) : null,
    is_one_time:   !!item.is_one_time,
    notes:         item.notes         || null,
    confidence:    item.confidence    || 'medium',
    times_per_day: n,
    time_slots:    buildTimeSlots(item.first_time || null, n),
  }
}

function parseJSON(raw) {
  raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const m = raw.match(/\[[\s\S]*\]/)
  if (m) raw = m[0]
  try { return JSON.parse(raw) } catch { return [] }
}

export async function analyzeWithGemini({ imageBase64, mimeType, text, lang = 'ru', onProgress }) {
  if (!CLIENT_KEY) {
    throw new Error('VITE_GEMINI_API_KEY не настроен. Добавьте в Vercel → Settings → Environment Variables.')
  }

  const ru = lang !== 'kk'
  const prompt = buildPrompt(lang)
  const parts  = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? prompt : (prompt + '\n\nДокумент:\n' + (text || '').slice(0, 8000)) })

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]
    if (onProgress) onProgress(`Анализирую... (${model})`)

    try {
      const res = await fetch(`${API_BASE}/${model}:generateContent?key=${CLIENT_KEY}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      })

      if (res.status === 503 || res.status === 429 || res.status === 404 || res.status === 400) {
        console.warn(`[${model}] ${res.status} — пробуем следующую`)
        if (i === MODELS.length - 1) throw new Error(`Gemini API временно недоступен (${res.status}). Попробуйте через минуту.`)
        continue
      }

      if (!res.ok) {
        const t = await res.text()
        throw new Error(`Gemini API ${res.status}: ${t.slice(0, 150)}`)
      }

      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'Gemini error')

      const candidate = data.candidates?.[0]
      if (!candidate) throw new Error('Gemini вернул пустой ответ')
      if (candidate.finishReason === 'SAFETY') throw new Error('Документ заблокирован фильтром безопасности')

      const allParts = candidate.content?.parts || []
      let raw = ''
      for (const p of allParts) { if (p.text) raw = p.text }

      const parsed = parseJSON(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) {
        // Gemini returned empty — return a placeholder so user knows to edit
        console.warn(`[${model}] returned empty array. raw:`, raw?.slice(0, 200))
        return [{
          type: 'medication',
          title: ru ? 'Не удалось распознать' : 'Cannot recognize',
          dose: null, times_per_day: 1, first_time: '08:00',
          duration_days: null, is_one_time: false,
          notes: ru ? 'Введите назначения вручную — нажмите редактировать' : 'Enter manually',
          confidence: 'low', time_slots: ['08:00'],
        }]
      }
      return parsed.map(normalizeItem)

    } catch (e) {
      if (i === MODELS.length - 1) throw e
      // network error — try next
      if (e.message?.includes('fetch') || e.message?.includes('network')) continue
      throw e
    }
  }

  throw new Error('Не удалось выполнить анализ. Попробуйте снова.')
}
