export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' })

  const prompt = `Ты медицинский ассистент. Извлеки все назначения врача из текста ниже.
Верни ТОЛЬКО JSON-массив без markdown и комментариев.
Каждый объект: {"type":"medication|exercise|procedure|appointment|restriction","title":"краткое название","time":"HH:MM","notes":"краткое примечание","freq":"частота"}.
Для времени используй логичные значения: утро=08:00, обед=13:00, вечер=20:00, ночь=22:00.
Если частота не указана — пиши "Ежедневно".

Текст:
${text}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      }
    )

    const data = await response.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return res.status(200).json({ items: parsed })
  } catch (e) {
    return res.status(500).json({ error: 'Gemini error: ' + e.message })
  }
}
