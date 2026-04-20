export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType, lang = 'ru' } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY не настроен в Vercel' })

  // ── Промт на языке пользователя — title/dose/notes в нужном языке ──
  const langName = lang === 'kk' ? 'казахском' : 'русском'

  const PROMPT =
    'Ты помощник врача. Из медицинского документа извлеки ВСЕ пункты: лекарства, процедуры, упражнения, диету, ограничения, рекомендации, визиты к врачу — абсолютно всё что написано.\n' +
    'НЕ фильтруй и НЕ пропускай ни одного пункта. Пациент сам решит что оставить.\n' +
    'Язык полей title/dose/notes: ' + langName + '.\n' +
    'Верни ТОЛЬКО JSON-массив:\n' +
    '[{"type":"medication","title":"Аспирин","dose":"100мг","times_per_day":1,"first_time":"08:00","duration_days":14,"is_one_time":false,"notes":"после еды"}]\n' +
    'type: medication, exercise, procedure, appointment, restriction, nutrition.\n' +
    'Если документ пустой или нечитаем — верни [{"type":"medication","title":"Не удалось прочитать документ","dose":null,"times_per_day":1,"first_time":"08:00","duration_days":null,"is_one_time":false,"notes":"Введите назначения вручную"}].\n' +
    'ТОЛЬКО JSON, никакого другого текста.'

  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? PROMPT : (PROMPT + '\n\nDocument:\n' + text.slice(0, 8000)) })

  // ── Конфиг генерации — минимум токенов, максимум скорости ──────────
  const genConfig = {
    temperature: 0.1,
    maxOutputTokens: 1024,
  }

  // ── Стратегия моделей ───────────────────────────────────────────────
  // ВАЖНО для Vercel Free (лимит 10 сек):
  //   - Таймаут = 8 сек на модель
  //   - Пробуем следующую ТОЛЬКО при сетевых ошибках (503/429/404)
  //   - При таймауте НЕ пробуем следующую — нет времени
  const MODELS = [
    'gemini-3-flash-preview',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite-preview-06-17',
  ]

  const startTime = Date.now()

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]
    const elapsed = Date.now() - startTime
    const remaining = 9000 - elapsed  // сколько осталось до Vercel timeout

    // Если осталось меньше 3 сек — нет смысла пробовать
    if (remaining < 3000) {
      return res.status(503).json({
        error: 'Недостаточно времени для следующей попытки. Попробуйте ещё раз.'
      })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), Math.min(remaining - 500, 8000))

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: genConfig,
          }),
        }
      )
      clearTimeout(timeout)

      // Сетевые ошибки — пробуем следующую модель
      if (r.status === 503 || r.status === 429 || r.status === 404 || r.status === 400) {
        const errText = await r.text().catch(() => '')
        console.log(`[${model}] ${r.status} — пробуем следующую`)
        if (i === MODELS.length - 1) {
          return res.status(503).json({
            error: `Gemini API временно недоступен (${r.status}). Подождите 1-2 минуты.`
          })
        }
        continue
      }

      // Другие HTTP ошибки — возвращаем сразу
      if (!r.ok) {
        const errText = await r.text().catch(() => '')
        return res.status(500).json({
          error: `Gemini API ${r.status}: ${errText.slice(0, 200)}`
        })
      }

      const data = await r.json()
      if (data.error) {
        return res.status(500).json({ error: data.error.message || 'Gemini error' })
      }

      const candidate = data.candidates?.[0]
      if (!candidate) {
        return res.status(500).json({ error: 'Gemini вернул пустой ответ. Попробуйте снова.' })
      }

      if (candidate.finishReason === 'SAFETY') {
        return res.status(400).json({ error: 'Документ заблокирован фильтром безопасности.' })
      }

      // Извлекаем текст (поддержка thinking-моделей с несколькими parts)
      const allParts = candidate.content?.parts || []
      let raw = ''
      for (const p of allParts) {
        if (p.text) raw = p.text  // берём последний text-блок
      }

      if (!raw.trim()) {
        return res.status(500).json({
          error: 'Gemini не вернул данные. finishReason: ' + candidate.finishReason
        })
      }

      // Парсим JSON
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const arrMatch = raw.match(/\[[\s\S]*\]/)
      if (arrMatch) raw = arrMatch[0]

      let parsed = []
      try { parsed = JSON.parse(raw) }
      catch { try { parsed = JSON.parse(tryFix(raw)) } catch { parsed = [] } }
      if (!Array.isArray(parsed)) parsed = []

      // Нормализуем и строим time_slots
      const result = parsed.map(item => {
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
      })

      console.log(`[${model}] OK — ${result.length} items, ${Date.now() - startTime}ms`)
      return res.status(200).json({ items: result, model_used: model })

    } catch (e) {
      clearTimeout(timeout)

      if (e.name === 'AbortError') {
        console.log(`[${model}] Timeout после ${Date.now() - startTime}ms`)
        // При таймауте не пробуем следующую — нет времени
        return res.status(504).json({
          error: 'Gemini не ответил вовремя. Попробуйте использовать текст вместо фото — это быстрее.'
        })
      }
      throw e
    }
  }

  return res.status(503).json({ error: 'Gemini временно недоступен. Попробуйте снова через минуту.' })
}

// ── Вспомогательные функции ────────────────────────────────────────────

function buildTimeSlots(firstTime, n) {
  if (n === 1) return [firstTime || '08:00']
  const preset = {
    2: ['08:00', '20:00'],
    3: ['08:00', '14:00', '20:00'],
    4: ['08:00', '12:00', '16:00', '20:00'],
    5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
    6: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
  }
  if (firstTime && preset[n] && firstTime !== preset[n][0]) {
    const [fh, fm] = firstTime.split(':').map(Number)
    const start = fh * 60 + fm
    const gap = Math.floor((24 * 60 - start) / n)
    return Array.from({ length: n }, (_, i) => {
      const t = start + i * gap
      return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    })
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
