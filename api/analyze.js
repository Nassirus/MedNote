export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType, lang = 'ru' } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  // English prompt = best results. Russian/Kazakh output via explicit instruction.
  const langLine = lang === 'kk'
    ? 'Write title, dose, notes in Kazakh language.'
    : 'Write title, dose, notes in Russian language.'

  const PROMPT =
    'You are a medical assistant. Extract ALL items from this medical document: ' +
    'medications, procedures, exercises, diet, restrictions, appointments, recommendations — everything.\n' +
    'Do NOT filter anything. The patient will decide what to keep.\n' +
    langLine + '\n' +
    'Return ONLY a JSON array. Each element:\n' +
    '{"type":"medication","title":"name","dose":"dosage or null","times_per_day":1,' +
    '"first_time":"08:00","duration_days":14,"is_one_time":false,"notes":"note or null"}\n' +
    'Allowed types: medication, exercise, procedure, appointment, restriction, nutrition.\n' +
    'If document is empty or unreadable return [].\n' +
    'ONLY JSON array, no other text, no markdown.'

  const parts = []
  // Text prompt first, then image — recommended order for Gemini Vision
  parts.push({ text: imageBase64 ? PROMPT : PROMPT + '\n\nDocument:\n' + text.slice(0, 8000) })
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }

  const MODELS = [
    'gemini-2.0-flash',         // fastest, most reliable
    'gemini-3-flash-preview',   // newer, fallback
    'gemini-2.0-flash-lite',    // lightest, own quota
  ]

  const startTime = Date.now()

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]
    const elapsed = Date.now() - startTime
    const timeLeft = 9200 - elapsed

    if (timeLeft < 2000) {
      return res.status(503).json({ error: 'Не хватило времени. Попробуйте ещё раз или вставьте текст вместо фото.' })
    }

    const controller = new AbortController()
    const tmo = setTimeout(() => controller.abort(), Math.min(timeLeft - 300, 8000))

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
        }
      )
      clearTimeout(tmo)

      // Retry on overload / quota / not found
      if ([400, 404, 429, 503].includes(r.status)) {
        const t = await r.text().catch(() => '')
        console.log(`[${model}] ${r.status} → next model. ${t.slice(0,80)}`)
        await new Promise(ok => setTimeout(ok, 200))
        continue
      }

      if (!r.ok) {
        const t = await r.text().catch(() => '')
        return res.status(500).json({ error: `Gemini ${r.status}: ${t.slice(0, 150)}` })
      }

      const data = await r.json()
      if (data.error) return res.status(500).json({ error: data.error.message })

      const candidate = data.candidates?.[0]
      if (!candidate) return res.status(500).json({ error: 'Пустой ответ от Gemini. Попробуйте снова.' })
      if (candidate.finishReason === 'SAFETY') return res.status(400).json({ error: 'Документ заблокирован фильтром безопасности.' })

      // Get text from response (supports thinking models with multiple parts)
      const allParts = candidate.content?.parts || []
      let raw = ''
      for (const p of allParts) { if (p.text) raw = p.text }

      console.log(`[${model}] OK ${Date.now()-startTime}ms, raw[:200]:`, raw.slice(0, 200))

      if (!raw.trim()) {
        return res.status(500).json({ error: 'Gemini не вернул текст. finishReason: ' + candidate.finishReason })
      }

      // Parse JSON
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
          title:         (item.title        || 'Назначение').trim().slice(0, 80),
          dose:          item.dose          || null,
          duration_days: item.duration_days ? parseInt(item.duration_days) : null,
          is_one_time:   !!item.is_one_time,
          notes:         item.notes         || null,
          confidence:    item.confidence    || 'medium',
          times_per_day: n,
          time_slots:    buildTimeSlots(item.first_time || null, n),
        }
      })

      return res.status(200).json({ items: result, model_used: model })

    } catch (e) {
      clearTimeout(tmo)
      if (e.name === 'AbortError') {
        console.log(`[${model}] timeout ${Date.now()-startTime}ms`)
        if (i < MODELS.length - 1 && 9200 - (Date.now() - startTime) > 2500) continue
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
