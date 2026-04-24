export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  // Оригинальный рабочий промт от 11 апреля — не менять
  const prompt = 'Ты врач. Из медицинского документа извлеки ТОЛЬКО домашние назначения пациента после выписки.\n'
    + 'ВКЛЮЧАЙ: лекарства, ЛФК, домашние процедуры, визиты к врачу, диету.\n'
    + 'НЕ ВКЛЮЧАЙ: стационарные процедуры, диагнозы, анамнез.\n\n'
    + 'Верни JSON-массив. Каждый элемент:\n'
    + '{"type":"medication|exercise|procedure|appointment|restriction|nutrition","title":"название","dose":"дозировка или null","times_per_day":1,"first_time":"08:00 или null","duration_days":null,"is_one_time":false,"notes":"заметка или null"}\n\n'
    + 'Если ничего нет — верни []\n'
    + 'ТОЛЬКО JSON, никакого текста вокруг.'

  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? prompt : (prompt + '\n\nДокумент:\n' + text) })

  // Модели — gemini-2.0-flash первая (без thinking = нет таймаута)
  // gemini-2.5-flash работала 11 апреля но вызывает таймаут на Vercel free
  const MODELS = [
    'gemini-2.0-flash',
    'gemini-3-flash-preview',
    'gemini-2.0-flash-lite',
  ]

  const startTime = Date.now()

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]
    const elapsed = Date.now() - startTime
    const timeLeft = 9200 - elapsed
    if (timeLeft < 2000) break

    const controller = new AbortController()
    const tmo = setTimeout(() => controller.abort(), Math.min(timeLeft - 300, 8500))

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
          }),
        }
      )
      clearTimeout(tmo)

      if ([400, 404, 429, 503].includes(r.status)) {
        const t = await r.text().catch(() => '')
        console.log(`[${model}] ${r.status} → next. ${t.slice(0,60)}`)
        continue
      }

      if (!r.ok) {
        const t = await r.text().catch(() => '')
        return res.status(500).json({ error: `Gemini ${r.status}: ${t.slice(0, 200)}` })
      }

      const data = await r.json()
      if (data.error) return res.status(500).json({ error: data.error.message })

      const candidate = data.candidates?.[0]
      if (!candidate) return res.status(500).json({ error: 'Пустой ответ от Gemini.' })
      if (candidate.finishReason === 'SAFETY') return res.status(400).json({ error: 'Документ заблокирован фильтром безопасности.' })

      // Берём ПОСЛЕДНИЙ text-блок (thinking-модели возвращают несколько parts)
      const allParts = candidate.content?.parts || []
      let raw = ''
      for (const p of allParts) {
        if (p.text) raw = p.text
      }

      if (!raw.trim()) {
        return res.status(500).json({ error: 'Gemini не вернул текст. finishReason: ' + candidate.finishReason })
      }

      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const m = raw.match(/\[[\s\S]*\]/)
      if (m) raw = m[0]

      let parsed = []
      try { parsed = JSON.parse(raw) } catch { try { parsed = JSON.parse(tryFix(raw)) } catch { parsed = [] } }
      if (!Array.isArray(parsed)) parsed = []

      const result = parsed.map(item => {
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

      console.log(`[${model}] OK ${Date.now()-startTime}ms, items: ${result.length}`)
      return res.status(200).json({ items: result })

    } catch (e) {
      clearTimeout(tmo)
      if (e.name === 'AbortError') {
        console.log(`[${model}] timeout ${Date.now()-startTime}ms`)
        if (i < MODELS.length - 1 && 9200 - (Date.now() - startTime) > 2000) continue
        return res.status(504).json({
          error: 'AI не успел обработать фото. Попробуйте вставить текст выписки — это работает быстрее.'
        })
      }
      throw e
    }
  }

  return res.status(503).json({ error: 'Gemini временно недоступен. Попробуйте через минуту.' })
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

function tryFix(str) {
  let s = str.trim()
  if (!s.startsWith('[')) s = '[' + s
  let depth = 0, inStr = false, esc = false
  for (const ch of s) {
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') depth++
    if (ch === '}' || ch === ']') depth--
  }
  if (inStr) s += '"'
  while (depth > 1) { s += '}'; depth-- }
  if (!s.endsWith(']')) s += ']'
  return s
}
