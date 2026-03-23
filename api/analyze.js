export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const instruction = 'Ты опытный клинический фармацевт и врач общей практики.\n'
    + 'Извлеки из медицинского документа ТОЛЬКО то, что пациент должен выполнять САМОСТОЯТЕЛЬНО ДОМА после выписки.\n\n'
    + 'ВКЛЮЧАЙ: приём лекарств, ЛФК/прогулки, домашние процедуры (измерение давления/сахара, ингаляции, перевязки), плановые визиты к врачу, диету, ограничения.\n'
    + 'НЕ ВКЛЮЧАЙ: стационарные процедуры (капельницы, физиотерапия в больнице, операции), диагнозы, результаты анализов.\n\n'
    + 'Верни ТОЛЬКО JSON-массив. Никаких пояснений. Никакого markdown.\n'
    + 'Каждый объект: {"type":"medication|exercise|procedure|appointment|restriction|nutrition|sleep","title":"название до 5 слов","dose":"дозировка или null","time":"HH:MM или null","endTime":"HH:MM или null","notes":"уточнение или null","freq":"Ежедневно|2 раза в день|3 раза в день|Раз в 2 дня|По будням|Раз в неделю|Разово или null","needs_schedule":false,"confidence":"high|medium|low"}\n\n'
    + 'Правила time: утром->08:00, обед->13:00, вечером->21:00, ночь->22:00, не указано->null\n'
    + 'needs_schedule: true если НЕ указаны ни time ни freq\n'
    + 'Если домашних назначений нет: []'

  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? instruction : (instruction + '\n\nДокумент:\n' + text) })

  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            // NOTE: responseMimeType NOT used — breaks thinking models
          },
        }),
      }
    )

    if (!r.ok) {
      const errText = await r.text()
      return res.status(500).json({ error: 'Gemini API error ' + r.status + ': ' + errText.slice(0, 300) })
    }

    const data = await r.json()

    if (data.error) {
      return res.status(500).json({ error: 'Gemini: ' + (data.error.message || JSON.stringify(data.error)) })
    }

    // Check for safety/finish reason issues
    const candidate = data.candidates?.[0]
    if (!candidate) {
      return res.status(500).json({ error: 'Gemini вернул пустой ответ. Попробуйте снова.' })
    }
    if (candidate.finishReason === 'SAFETY') {
      return res.status(500).json({ error: 'Изображение заблокировано фильтром безопасности Gemini.' })
    }

    let raw = candidate.content?.parts?.[0]?.text || '[]'

    // Strip markdown code fences
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    // Extract the JSON array
    const m = raw.match(/\[[\s\S]*\]/)
    if (m) raw = m[0]

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      try { parsed = JSON.parse(tryFixTruncated(raw)) }
      catch { parsed = [] }
    }

    if (!Array.isArray(parsed)) parsed = []

    // Auto-split 2x/3x daily into separate timed entries
    const result = []
    for (const item of parsed) {
      result.push(item)
      if (item.freq === '2 раза в день' && item.time === '08:00') {
        result.push({ ...item, time: '20:00', notes: ((item.notes || '') + ' (вечер)').trim() })
      }
      if (item.freq === '3 раза в день' && item.time === '08:00') {
        result.push({ ...item, time: '13:00', notes: ((item.notes || '') + ' (обед)').trim() })
        result.push({ ...item, time: '20:00', notes: ((item.notes || '') + ' (вечер)').trim() })
      }
    }

    return res.status(200).json({ items: result })
  } catch (e) {
    return res.status(500).json({ error: 'Ошибка: ' + e.message })
  }
}

function tryFixTruncated(str) {
  let s = str.trim()
  if (!s.startsWith('[')) s = '[' + s
  let depth = 0, inStr = false, escape = false
  for (const ch of s) {
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
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
