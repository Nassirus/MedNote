export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const instruction = `Ты медицинский ассистент. Извлеки ВСЕ назначения врача из документа.
Верни ТОЛЬКО валидный JSON-массив. Никаких пояснений, никакого markdown, никаких кавычек вокруг массива.
Начни ответ с символа [ и закончи символом ].
Каждый объект: {"type":"medication|exercise|procedure|appointment|restriction|routine|nutrition|sleep","title":"название","time":"HH:MM","notes":"примечание","freq":"частота"}
Правила time: утро→"08:00", обед→"13:00", вечер→"20:00", ночь→"22:00", явное время — точно.
Правила freq: не указано→"Ежедневно".
Если текст нечёткий — извлеки максимум.`

  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? instruction : `${instruction}\n\nТекст:\n${text}` })

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'  // force JSON output
          }
        })
      }
    )

    const data = await r.json()
    if (data.error) throw new Error(data.error.message)

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

    // Robust cleanup: strip markdown fences, leading/trailing whitespace
    let clean = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Extract JSON array if there's surrounding text
    const arrayMatch = clean.match(/\[[\s\S]*\]/)
    if (arrayMatch) clean = arrayMatch[0]

    // Attempt parse — if it fails, try to recover truncated JSON
    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      // Try to fix truncated JSON by closing open structures
      const fixed = tryFixTruncated(clean)
      parsed = JSON.parse(fixed)
    }

    if (!Array.isArray(parsed)) parsed = []

    return res.status(200).json({ items: parsed })
  } catch (e) {
    return res.status(500).json({ error: 'Gemini error: ' + e.message })
  }
}

// Attempt to fix truncated JSON arrays
function tryFixTruncated(str) {
  let s = str.trim()
  if (!s.startsWith('[')) s = '[' + s
  // Count unclosed braces/brackets
  let depth = 0
  let inStr = false
  let escape = false
  for (const ch of s) {
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') depth++
    if (ch === '}' || ch === ']') depth--
  }
  // Close any unclosed strings/objects/arrays
  if (inStr) s += '"'
  while (depth > 1) { s += '}'; depth-- }
  if (!s.endsWith(']')) s += ']'
  return s
}
