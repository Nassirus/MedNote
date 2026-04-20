export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  // Simple, direct prompt — less is more for Gemini
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

  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!r.ok) {
      const t = await r.text()
      if (r.status === 429) return res.status(429).json({ error: 'Лимит Gemini API. Подождите минуту.' })
      return res.status(500).json({ error: 'Gemini API ' + r.status + ': ' + t.slice(0, 300) })
    }

    const data = await r.json()
    if (data.error) return res.status(500).json({ error: data.error.message || 'Gemini error' })

    const candidate = data.candidates?.[0]
    if (!candidate) return res.status(500).json({ error: 'Пустой ответ от Gemini.' })

    // Log finishReason for debugging
    const reason = candidate.finishReason
    if (reason === 'SAFETY') return res.status(500).json({ error: 'Документ заблокирован фильтром безопасности.' })

    // Extract text — works for both regular and thinking models
    // Thinking models may return multiple parts; get the last text part
    const allParts = candidate.content?.parts || []
    let raw = ''
    for (const p of allParts) {
      if (p.text) raw = p.text  // keep overwriting — last text part is the answer
    }

    if (!raw) {
      return res.status(500).json({
        error: 'Gemini не вернул текст. finishReason: ' + reason + '. Попробуйте снова.'
      })
    }

    // Clean markdown fences
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    // Extract JSON array
    const arrMatch = raw.match(/\[[\s\S]*\]/)
    if (arrMatch) raw = arrMatch[0]

    let parsed
    try { parsed = JSON.parse(raw) }
    catch {
      // Try to fix truncated JSON
      try { parsed = JSON.parse(tryFix(raw)) }
      catch { parsed = [] }
    }
    if (!Array.isArray(parsed)) parsed = []

    // Build time_slots for each item
    const result = parsed.map(item => {
      const n          = Math.max(1, Math.min(6, parseInt(item.times_per_day) || 1))
      const time_slots = buildTimeSlots(item.first_time || null, n)
      return {
        type:          item.type         || 'routine',
        title:         (item.title       || 'Назначение').trim(),
        dose:          item.dose         || null,
        duration_days: item.duration_days ? parseInt(item.duration_days) : null,
        is_one_time:   !!item.is_one_time,
        notes:         item.notes        || null,
        confidence:    item.confidence   || 'medium',
        times_per_day: n,
        time_slots,
      }
    })

    return res.status(200).json({ items: result })

  } catch (e) {
    return res.status(500).json({ error: 'Ошибка сервера: ' + e.message })
  }
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
