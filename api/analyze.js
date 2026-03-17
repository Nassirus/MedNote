export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body || {}
  if (!text) return res.status(400).json({ error: 'No text provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const prompt = `Ты медицинский ассистент. Извлеки ВСЕ назначения врача из текста.
Верни ТОЛЬКО валидный JSON-массив без markdown, без комментариев, без пояснений.
Каждый объект строго в формате:
{"type":"medication|exercise|procedure|appointment|restriction|routine|nutrition|sleep","title":"название","time":"HH:MM","notes":"примечание","freq":"частота"}

Правила для time:
- утро/с утра/натощак → "08:00"
- обед/в обед → "13:00"  
- вечер/на ночь/вечером → "20:00"
- ночь → "22:00"
- если указано время явно — используй его точно

Правила для freq:
- если не указано → "Ежедневно"
- 2 раза в день → "2 раза в день"
- 1 раз в неделю → "Раз в неделю"

Текст для анализа:
${text}`

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1500 }
        })
      }
    )
    const data = await r.json()
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return res.status(200).json({ items: parsed })
  } catch (e) {
    return res.status(500).json({ error: 'Gemini error: ' + e.message })
  }
}
