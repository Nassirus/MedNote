/**
 * geminiClient.js — direct browser → Gemini API (copied from MedIQ working implementation)
 * No Vercel server, no timeout limits.
 * Requires: VITE_GEMINI_API_KEY in Vercel env vars
 */

const MODELS = [
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
]

// Промт — умная диагностика сроков по КП МЗ РК
const SYSTEM_PROMPT =
  'Ты опытный врач-терапевт. Извлеки ВСЕ домашние назначения из выписки и определи срок каждого.\n\n' +

  '═══ ШАГ 1: ИЗВЛЕЧЕНИЕ ═══\n' +
  'Извлеки: лекарства, ЛФК, процедуры, визиты к врачу, диету, уход за раной, ограничения.\n' +
  'НЕ включай: стационарные процедуры, диагнозы, анамнез.\n\n' +

  '═══ ШАГ 2: ОПРЕДЕЛЕНИЕ СРОКОВ ═══\n' +
  'Для каждого назначения определи duration_days по СЛЕДУЮЩЕМУ ПРИОРИТЕТУ:\n\n' +

  'ПРИОРИТЕТ 1 — Явное указание в выписке:\n' +
  '  "7 дней", "2 недели", "1 месяц" → конвертируй в дни\n' +
  '  "до снятия швов" + "швы снять через 10 дней" → duration_days=10\n' +
  '  "до нормализации температуры" → duration_days=7\n' +
  '  "пожизненно / постоянно" → duration_days=null\n\n' +

  'ПРИОРИТЕТ 2 — Если в выписке срок НЕ указан, применяй ОФИЦИАЛЬНЫЕ КП МЗ РК:\n' +
  'Используй ТОЛЬКО актуальные Клинические протоколы МЗ РК (portal.zdravkaz.kz).\n' +
  'Примеры стандартных сроков по КП МЗ РК:\n' +
  '  Антибиотики при ОРВИ/ОРЗ: 5-7 дней\n' +
  '  Антибиотики при пневмонии: 7-14 дней\n' +
  '  Антибиотики при ИМП (цистит): 5-7 дней\n' +
  '  НПВС при болевом синдроме: 5-7 дней\n' +
  '  Уход за послеоперационной раной: до снятия швов (7-10 дней)\n' +
  '  ЛФК после переломов: 21-30 дней\n' +
  '  Диета при гастрите: 14-30 дней\n' +
  '  Антигипертензивные: duration_days=null (постоянно)\n' +
  '  Противодиабетические: duration_days=null (постоянно)\n' +
  '  Статины: duration_days=null (постоянно)\n' +
  '  Витамины/БАД курсом: 30 дней\n' +
  '  Физиотерапия: 10-15 процедур\n\n' +

  'ПРИОРИТЕТ 3 — Если ни выписка ни КП МЗ РК не дают срок → duration_days=null\n\n' +

  '═══ ШАГ 3: ФОРМАТ ОТВЕТА ═══\n' +
  'Верни JSON-массив. Каждый элемент:\n' +
  '{"type":"medication|exercise|procedure|appointment|restriction|nutrition","title":"название на русском","dose":"дозировка или null","times_per_day":1,"first_time":"08:00 или null","duration_days":7,"is_one_time":false,"notes":"заметка на русском или null","kp_source":"КП МЗ РК [нозология] или null"}\n\n' +
  'Поле kp_source заполни ТОЛЬКО если срок взят из КП МЗ РК, не из выписки. Например: "КП МЗ РК — Пневмония"\n\n' +
  'Если назначений нет — верни []\n' +
  'ТОЛЬКО JSON, никакого другого текста.'

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

function extractJSON(raw) {
  if (!raw || !raw.trim()) return null
  // Strip markdown fences
  let s = raw.replace(/^[\s\S]*?```json\s*/i, '').replace(/```[\s\S]*$/g, '').trim()
  if (!s.startsWith('[') && !s.startsWith('{')) {
    const idx = raw.search(/[\[{]/)
    if (idx >= 0) s = raw.slice(idx)
    else s = raw
  }
  try { return JSON.parse(s) } catch {}
  // Find array boundaries
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)) } catch {}
  }
  return null
}

export async function analyzeWithGemini({ imageBase64, mimeType, text }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('NO_KEY')

  // Build parts — image or text
  const userParts = []
  if (imageBase64) {
    userParts.push({ inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } })
    userParts.push({ text: 'Это медицинский документ. Извлеки все назначения.' })
  } else {
    userParts.push({ text: 'Документ:\n' + (text || '') })
  }

  let lastErr = ''

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]
    const isGemini3 = model.startsWith('gemini-3')

    // Build body — exactly like MedIQ does it
    const body = {
      contents: [{ role: 'user', parts: userParts }],
      // systemInstruction as SEPARATE field — key difference from before
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.1,
        // thinkingConfig only for Gemini 3 — other models don't support it
        ...(isGemini3 ? { thinkingConfig: { thinkingLevel: 'MINIMAL' } } : {}),
      },
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(90000), // 90s — no server limit in browser
        }
      )

      if (res.status === 429 || res.status === 503) {
        lastErr = `${model}: ${res.status}`
        console.warn('[gemini]', lastErr, '— trying next model')
        if (i < MODELS.length - 1) await new Promise(r => setTimeout(r, 500))
        continue
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error('Неверный API ключ Gemini. Проверьте VITE_GEMINI_API_KEY в настройках Vercel.')
      }

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        // 400 Bad Request — thinkingConfig not supported by this model, try next
        if (res.status === 400 && i < MODELS.length - 1) {
          lastErr = `${model}: 400`
          console.warn('[gemini] 400 on', model, '— trying next')
          continue
        }
        throw new Error(`Gemini ${res.status}: ${t.slice(0, 100)}`)
      }

      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'Gemini error')

      const candidate = data.candidates?.[0]
      if (!candidate) throw new Error('Пустой ответ от Gemini')
      if (candidate.finishReason === 'SAFETY') throw new Error('Документ заблокирован фильтром безопасности')

      // Get text — collect ALL parts, take last text (thinking models return thought + answer)
      const allParts = candidate.content?.parts || []
      let raw = ''
      for (const p of allParts) {
        if (typeof p.text === 'string') raw = p.text
      }

      console.log(`[gemini] ${model} OK, raw[:300]:`, raw.slice(0, 300))

      const parsed = extractJSON(raw)
      if (!parsed || !Array.isArray(parsed)) {
        console.warn('[gemini] could not parse JSON:', raw.slice(0, 200))
        return []
      }

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
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        throw new Error('Gemini не ответил вовремя (90 сек). Попробуйте ещё раз.')
      }
      lastErr = e.message
      if (i < MODELS.length - 1) {
        console.warn('[gemini] error on', model, ':', e.message, '— trying next')
        continue
      }
      throw new Error(lastErr)
    }
  }

  throw new Error('Все модели Gemini недоступны: ' + lastErr)
}
