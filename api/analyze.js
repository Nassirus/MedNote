export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const instruction = 'Ты опытный клинический фармацевт и врач общей практики.\n'
    + 'Извлеки из документа ТОЛЬКО то, что пациент должен выполнять САМОСТОЯТЕЛЬНО ДОМА после выписки.\n\n'
    + 'ВКЛЮЧАЙ: лекарства, ЛФК/прогулки, домашние процедуры, плановые визиты, диету, ограничения.\n'
    + 'НЕ ВКЛЮЧАЙ: стационарные процедуры (капельницы, физиотерапия в больнице, операции), диагнозы, уже выполненные назначения.\n\n'
    + 'Для каждого назначения верни объект. ВАЖНО — извлекай ВСЕ параметры из текста:\n\n'
    + 'type: "medication" | "exercise" | "procedure" | "appointment" | "restriction" | "nutrition" | "sleep"\n'
    + 'title: краткое название (до 5 слов)\n'
    + 'dose: дозировка (например "500мг", "1 таблетка", "2 капли") или null\n'
    + 'times_per_day: ЧИСЛО приёмов в день. 1=один раз, 2=два раза, 3=три раза. Извлекай из текста: "2 раза в день"->2, "утром и вечером"->2, "3 раза"->3. Если не указано->1\n'
    + 'first_time: время ПЕРВОГО приёма HH:MM. утром/натощак->08:00, обед->13:00, вечером->21:00, ночь->22:00. Если не указано->null\n'
    + 'duration_days: ЧИСЛО дней курса. Извлекай: "14 дней"->14, "2 недели"->14, "1 месяц"->30, "курс 10 дней"->10. Если бессрочно или не указано->null\n'
    + 'is_one_time: true если это разовое событие (визит к врачу, однократная процедура). Иначе false\n'
    + 'notes: важное уточнение (до 8 слов) или null\n'
    + 'confidence: "high" если явно в тексте, "medium" если следует из контекста, "low" если неточно\n\n'
    + 'Верни ТОЛЬКО JSON-массив без markdown. Пример:\n'
    + '[{"type":"medication","title":"Аспирин","dose":"100мг","times_per_day":1,"first_time":"08:00","duration_days":14,"is_one_time":false,"notes":"после еды","confidence":"high"}]\n'
    + 'Если домашних назначений нет: []'

  const parts = []
  if (imageBase64) parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  parts.push({ text: imageBase64 ? instruction : (instruction + '\n\nДокумент:\n' + text) })

  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.05, maxOutputTokens: 4096 },
        }),
      }
    )

    if (!r.ok) {
      const t = await r.text()
      if (r.status === 429) return res.status(429).json({ error: 'Лимит Gemini API. Подождите минуту и попробуйте снова.' })
      return res.status(500).json({ error: 'Gemini API ' + r.status + ': ' + t.slice(0, 200) })
    }

    const data = await r.json()
    if (data.error) return res.status(500).json({ error: data.error.message || 'Gemini error' })

    const candidate = data.candidates?.[0]
    if (!candidate) return res.status(500).json({ error: 'Пустой ответ от Gemini. Попробуйте снова.' })
    if (candidate.finishReason === 'SAFETY') return res.status(500).json({ error: 'Изображение заблокировано фильтром безопасности.' })

    let raw = candidate.content?.parts?.[0]?.text || '[]'
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const m = raw.match(/\[[\s\S]*\]/)
    if (m) raw = m[0]

    let parsed
    try { parsed = JSON.parse(raw) }
    catch { try { parsed = JSON.parse(tryFix(raw)) } catch { parsed = [] } }
    if (!Array.isArray(parsed)) parsed = []

    // Normalize and expand multi-dose items into separate time entries
    const today = new Date()
    const result = []
    for (const item of parsed) {
      const timesPerDay = Math.max(1, Math.min(6, parseInt(item.times_per_day) || 1))
      const firstTime   = item.first_time || null

      // Calculate all time slots for the day
      const timeSlots = buildTimeSlots(firstTime, timesPerDay)

      // Build normalized item
      const base = {
        type:          item.type || 'routine',
        title:         (item.title || 'Назначение').trim(),
        dose:          item.dose || null,
        duration_days: item.duration_days ? parseInt(item.duration_days) : null,
        is_one_time:   !!item.is_one_time,
        notes:         item.notes || null,
        confidence:    item.confidence || 'medium',
        times_per_day: timesPerDay,
        time_slots:    timeSlots,   // array of HH:MM strings
      }

      result.push(base)
    }

    return res.status(200).json({ items: result })
  } catch (e) {
    return res.status(500).json({ error: 'Ошибка: ' + e.message })
  }
}

// Build evenly-spaced time slots for N doses per day
function buildTimeSlots(firstTime, n) {
  if (n === 1) return [firstTime || '08:00']
  // Common schedules
  const schedules = {
    2: ['08:00', '20:00'],
    3: ['08:00', '14:00', '20:00'],
    4: ['08:00', '12:00', '16:00', '20:00'],
    5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
    6: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
  }
  if (schedules[n]) {
    const slots = [...schedules[n]]
    // If firstTime specified and different from default, adjust
    if (firstTime && firstTime !== slots[0]) {
      const [fh, fm] = firstTime.split(':').map(Number)
      const startMins = fh * 60 + fm
      const interval = Math.floor((24 * 60 - startMins) / n)
      return Array.from({ length: n }, (_, i) => {
        const total = startMins + i * interval
        return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
      })
    }
    return slots
  }
  return [firstTime || '08:00']
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
