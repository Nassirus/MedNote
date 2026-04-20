/**
 * geminiClient.js — direct browser → Gemini API
 * Bypasses Vercel 10s timeout completely.
 * Requires: VITE_GEMINI_API_KEY in Vercel env vars
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const MODELS = [
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
  'gemini-2.0-flash-lite',
]

function getPrompt(lang) {
  const langLine = lang === 'kk'
    ? 'Write title, dose, notes in Kazakh language.'
    : 'Write title, dose, notes in Russian language.'

  return (
    'You are a medical assistant. Extract ALL items from this medical document: ' +
    'medications, procedures, exercises, diet, restrictions, appointments — everything.\n' +
    'Do NOT filter anything. The patient will decide what to keep.\n' +
    langLine + '\n' +
    'Return ONLY a JSON array. Each element:\n' +
    '{"type":"medication","title":"name","dose":"dosage or null","times_per_day":1,' +
    '"first_time":"08:00","duration_days":14,"is_one_time":false,"notes":"note or null"}\n' +
    'Allowed types: medication, exercise, procedure, appointment, restriction, nutrition.\n' +
    'If document is unreadable return [].\n' +
    'ONLY JSON array, no markdown, no explanations.'
  )
}

function parseJSON(raw) {
  raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const m = raw.match(/\[[\s\S]*\]/)
  if (m) raw = m[0]
  try { return JSON.parse(raw) } catch { return null }
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
    title:         (item.title        || 'Назначение').trim().slice(0, 80),
    dose:          item.dose          || null,
    duration_days: item.duration_days ? parseInt(item.duration_days) : null,
    is_one_time:   !!item.is_one_time,
    notes:         item.notes         || null,
    confidence:    item.confidence    || 'medium',
    times_per_day: n,
    time_slots:    buildTimeSlots(item.first_time || null, n),
  }
}

export async function analyzeWithGemini({ imageBase64, mimeType, text, lang = 'ru' }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('NO_KEY')

  const prompt = getPrompt(lang)

  // Text prompt first, then image (recommended order for Gemini Vision)
  const parts = []
  parts.push({ text: imageBase64 ? prompt : prompt + '\n\nDocument:\n' + (text || '').slice(0, 8000) })
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }

  let lastError = ''

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]

    try {
      const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      })

      if ([400, 404, 429, 503].includes(res.status)) {
        lastError = `${model} ${res.status}`
        console.warn(`[geminiClient] ${lastError}, trying next...`)
        await new Promise(r => setTimeout(r, 300))
        continue
      }

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Gemini ${res.status}: ${t.slice(0, 100)}`)
      }

      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'Gemini error')

      const candidate = data.candidates?.[0]
      if (!candidate) throw new Error('Пустой ответ от Gemini')
      if (candidate.finishReason === 'SAFETY') throw new Error('Документ заблокирован фильтром')

      // Get text — last text part (thinking models return multiple parts)
      const allParts = candidate.content?.parts || []
      let raw = ''
      for (const p of allParts) { if (p.text) raw = p.text }

      console.log(`[geminiClient] ${model} OK, raw[:300]:`, raw.slice(0, 300))

      const parsed = parseJSON(raw)
      if (!parsed || !Array.isArray(parsed)) {
        console.warn('[geminiClient] Could not parse JSON, raw:', raw.slice(0, 200))
        return []
      }

      return parsed.map(normalizeItem)

    } catch (e) {
      if (e.message === 'NO_KEY') throw e
      lastError = e.message
      if (i < MODELS.length - 1) {
        console.warn(`[geminiClient] ${model} error: ${e.message}, trying next...`)
        continue
      }
      throw new Error(lastError)
    }
  }

  throw new Error('Все модели Gemini недоступны: ' + lastError)
}
