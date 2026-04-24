/**
 * geminiClient.js — прямой вызов Gemini из браузера
 * Обходит 10-секундный лимит Vercel полностью.
 * Требует: VITE_GEMINI_API_KEY в переменных Vercel
 */

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

// Точный рабочий промт от 11 апреля — не менять
const PROMPT =
  'Ты врач. Из медицинского документа извлеки ТОЛЬКО домашние назначения пациента после выписки.\n'
  + 'ВКЛЮЧАЙ: лекарства, ЛФК, домашние процедуры, визиты к врачу, диету.\n'
  + 'НЕ ВКЛЮЧАЙ: стационарные процедуры, диагнозы, анамнез.\n\n'
  + 'Верни JSON-массив. Каждый элемент:\n'
  + '{"type":"medication|exercise|procedure|appointment|restriction|nutrition","title":"название","dose":"дозировка или null","times_per_day":1,"first_time":"08:00 или null","duration_days":null,"is_one_time":false,"notes":"заметка или null"}\n\n'
  + 'Если ничего нет — верни []\n'
  + 'ТОЛЬКО JSON, никакого текста вокруг.'

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

function parseJSON(raw) {
  raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const m = raw.match(/\[[\s\S]*\]/)
  if (m) raw = m[0]
  try { return JSON.parse(raw) } catch { return null }
}

export async function analyzeWithGemini({ imageBase64, mimeType, text }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('NO_KEY')

  // Изображение первым, промт вторым — оригинальный порядок от 11 апреля
  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? PROMPT : (PROMPT + '\n\nДокумент:\n' + (text || '')) })

  let lastErr = ''

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
          }),
        }
      )

      if ([400, 404, 429, 503].includes(res.status)) {
        lastErr = `${model}: HTTP ${res.status}`
        console.warn('[gemini]', lastErr)
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

      // Берём последний text-блок (thinking-модели возвращают несколько parts)
      const allParts = candidate.content?.parts || []
      let raw = ''
      for (const p of allParts) { if (p.text) raw = p.text }

      console.log(`[gemini] ${model} OK, raw[:200]:`, raw.slice(0, 200))

      const parsed = parseJSON(raw)
      if (!parsed || !Array.isArray(parsed)) return []

      return parsed.map(item => {
        const n = Math.max(1, Math.min(6, parseInt(item.times_per_day) || 1))
        return {
          type:          item.type          || 'routine',
          title:         (item.title        || 'Назначение').trim(),
          dose:          item.dose          || null,
          duration_days: item.duration_days ? parseInt(item.duration_days) : null,
          is_one_time:   !!item.is_one_time,
          notes:         item.notes         || null,
          confidence:    item.confidence    || 'medium',
          times_per_day: n,
          time_slots:    buildTimeSlots(item.first_time || null, n),
        }
      })

    } catch (e) {
      if (e.message === 'NO_KEY') throw e
      lastErr = e.message
      if (i < MODELS.length - 1) { console.warn('[gemini] retry:', e.message); continue }
      throw new Error(lastErr)
    }
  }

  throw new Error('Gemini недоступен: ' + lastErr)
}
