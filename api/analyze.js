export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const instruction = `Ты опытный клинический фармацевт и врач общей практики с 15-летним стажем.
Твоя задача: извлечь из медицинского документа ТОЛЬКО то, что пациент должен выполнять САМОСТОЯТЕЛЬНО В ДОМАШНИХ УСЛОВИЯХ после выписки.

ВКЛЮЧАЙ:
- Приём лекарств (название, дозировка, кратность, время суток)
- Физические упражнения, ЛФК, прогулки назначенные на дому
- Процедуры которые пациент делает сам (перевязки, измерение давления/сахара, ингаляции)
- Диетические рекомендации (ограничения, режим питания)
- Плановые визиты к врачу, сдача анализов
- Ограничения активности (запреты нагрузок и т.д.)

НЕ ВКЛЮЧАЙ:
- Процедуры проведённые в стационаре (капельницы, операции, физиотерапия в больнице)
- Назначения которые уже выполнены или только для стационара
- Диагнозы, анамнез, описание болезни
- Результаты анализов (только если нужно сдать повторно)
- Рекомендации общего характера без конкретного действия

Для каждого найденного пункта определи:
- type: "medication" | "exercise" | "procedure" | "appointment" | "restriction" | "nutrition" | "sleep"
- title: краткое понятное название действия (не более 5 слов)
- dose: дозировка/количество если есть (например "500мг", "1 таблетка", "30 минут")
- time: время суток в формате HH:MM. Правила:
  * "утром/натощак/до завтрака" → "08:00"
  * "в обед/после обеда" → "13:00"
  * "вечером/на ночь" → "21:00"
  * "2 раза в день" → первый приём "08:00"
  * "3 раза в день" → первый приём "08:00"
  * если время не указано → null
- endTime: время окончания если указана длительность (например процедура 30 мин → time+30мин), иначе null
- notes: краткое важное уточнение (например "до еды", "запить водой", "не совмещать с молоком"). Максимум 10 слов.
- freq: частота. Правила:
  * ежедневно/каждый день → "Ежедневно"
  * 2 раза в день → "2 раза в день"
  * через день → "Раз в 2 дня"
  * по будням → "По будням"
  * 1 раз в неделю → "Раз в неделю"
  * курс N дней → "Курс ${N} дней"
  * если частота НЕ указана явно → null
- duration_days: количество дней курса если указано, иначе null
- needs_schedule: true ЕСЛИ не указано ни время ни частота (пациент должен сам уточнить расписание), иначе false
- confidence: "high" если явно написано в документе, "medium" если можно предположить, "low" если неточно

Верни ТОЛЬКО JSON-массив. Начни с [ и закончи с ].
Формат каждого объекта:
{"type":"...","title":"...","dose":"...или null","time":"HH:MM или null","endTime":"HH:MM или null","notes":"...","freq":"...или null","duration_days":null,"needs_schedule":false,"confidence":"high"}

Если назначений для самостоятельного выполнения не найдено, верни: []`

  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? instruction : `${instruction}\n\nДокумент для анализа:\n${text}` })

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.05,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    const data = await r.json()
    if (data.error) throw new Error(data.error.message)

    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

    // Clean up any markdown or extra text
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const arrayMatch = raw.match(/\[[\s\S]*\]/)
    if (arrayMatch) raw = arrayMatch[0]

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = JSON.parse(tryFixTruncated(raw))
    }

    if (!Array.isArray(parsed)) parsed = []

    // Post-process: build second_time for 2x/day medications
    const result = []
    for (const item of parsed) {
      result.push(item)
      // If "2 раза в день" and time is morning, add evening dose
      if (item.freq === '2 раза в день' && item.time === '08:00') {
        result.push({ ...item, id: undefined, time: '20:00', notes: (item.notes || '') + ' (вечер)' })
      }
      if (item.freq === '3 раза в день' && item.time === '08:00') {
        result.push({ ...item, id: undefined, time: '13:00', notes: (item.notes || '') + ' (обед)' })
        result.push({ ...item, id: undefined, time: '20:00', notes: (item.notes || '') + ' (вечер)' })
      }
    }

    return res.status(200).json({ items: result })
  } catch (e) {
    return res.status(500).json({ error: 'Gemini error: ' + e.message })
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
