export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, imageBase64, mimeType } = req.body || {}
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const instruction = `Ты медицинский ассистент. Извлеки ВСЕ назначения врача из документа.
Верни ТОЛЬКО валидный JSON-массив без markdown, комментариев и пояснений.
Каждый объект строго:
{"type":"medication|exercise|procedure|appointment|restriction|routine|nutrition|sleep","title":"название","time":"HH:MM","notes":"примечание","freq":"частота"}

Правила time: утро/натощак→"08:00", обед→"13:00", вечер→"20:00", ночь→"22:00", если явно указано — используй точно.
Правила freq: не указано→"Ежедневно", 2 раза в день→"2 раза в день".
Если документ нечёткий или рукописный — постарайся максимально извлечь данные.`

  // Build parts array — supports text AND/OR image
  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: imageBase64 ? instruction : `${instruction}\n\nТекст:\n${text}` })

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
        })
      }
    )
    const data = await r.json()
    if (data.error) throw new Error(data.error.message)
    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const clean  = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return res.status(200).json({ items: parsed })
  } catch (e) {
    return res.status(500).json({ error: 'Gemini error: ' + e.message })
  }
}
