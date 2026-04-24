/**
 * geminiClient.js — прямой вызов из браузера, без Vercel timeout
 * Требует: VITE_GEMINI_API_KEY в Vercel env vars
 * Использует тот же оригинальный промт что работал 11 апреля
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const MODELS = [
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
  'gemini-2.0-flash-lite',
]

// ОРИГИНАЛЬНЫЙ промт — точная копия того что работало 11 апреля
const INSTRUCTION = `Ты медицинский ассистент. Извлеки ВСЕ назначения врача из документа.
Верни ТОЛЬКО валидный JSON-массив без markdown, комментариев и пояснений.
Начни ответ с символа [ и закончи символом ].
Каждый объект строго:
{"type":"medication|exercise|procedure|appointment|restriction|routine|nutrition|sleep","title":"название","time":"HH:MM","notes":"примечание","freq":"частота"}

Правила time: утро/натощак/до завтрака → "08:00", в обед/после обеда → "13:00", вечером/на ночь → "21:00", 2 раза в день → первый приём "08:00", 3 раза в день → первый приём "08:00", если явно указано — использовать точно.
Правила freq: не указано → "Ежедневно", 2 раза в день → "2 раза в день", через день → "Раз в 2 дня".
Если документ нечёткий или рукописный — постарайся максимально извлечь данные.`

export async function analyzeWithGemini({ imageBase64, mimeType, text }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('NO_KEY')

  // ОРИГИНАЛЬНЫЙ ПОРЯДОК: изображение ПЕРВЫМ
  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? INSTRUCTION : `${INSTRUCTION}\n\nТекст:\n${(text || '').slice(0, 8000)}` })

  let lastError = ''

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]

    try {
      const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'  // ОРИГИНАЛ
          }
        })
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

      const allParts = candidate.content?.parts || []
      let raw = ''
      for (const p of allParts) { if (p.text) raw = p.text }

      console.log(`[geminiClient] ${model} OK, raw[:200]:`, raw.slice(0, 200))

      // Парсим JSON
      let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const m = clean.match(/\[[\s\S]*\]/)
      if (m) clean = m[0]

      let parsed = []
      try { parsed = JSON.parse(clean) }
      catch { parsed = [] }
      if (!Array.isArray(parsed)) parsed = []

      // Разбиваем 2x/3x дозировки
      const result = []
      for (const item of parsed) {
        result.push(item)
        if (item.freq === '2 раза в день' && item.time === '08:00') {
          result.push({ ...item, time: '20:00', notes: (item.notes || '') + ' (вечер)' })
        }
        if (item.freq === '3 раза в день' && item.time === '08:00') {
          result.push({ ...item, time: '13:00', notes: (item.notes || '') + ' (обед)' })
          result.push({ ...item, time: '20:00', notes: (item.notes || '') + ' (вечер)' })
        }
      }

      return result

    } catch (e) {
      if (e.message === 'NO_KEY') throw e
      lastError = e.message
      if (i < MODELS.length - 1) continue
      throw new Error(lastError)
    }
  }

  throw new Error('Все модели Gemini недоступны: ' + lastError)
}
