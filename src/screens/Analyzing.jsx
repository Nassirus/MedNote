import { useEffect, useState } from 'react'

const STEPS = ['Распознаю текст...', 'Извлекаю назначения...', 'Формирую расписание...']

export default function Analyzing() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 1200)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0369A1', padding: 28 }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>🤖</div>
      <div style={{ width: 44, height: 44, border: '4px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.9s linear infinite', marginBottom: 22 }} />
      <h2 style={{ fontWeight: 700, fontSize: 20, color: 'white', marginBottom: 8 }}>Анализирую документ...</h2>
      <p style={{ color: '#BAE6FD', textAlign: 'center', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
        Gemini AI извлекает назначения,<br />дозировки и расписание
      </p>
      {STEPS.map((s, i) => (
        <div key={s} style={{
          marginTop: 8, display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', background: i <= step ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
          borderRadius: 10, width: '100%', transition: 'background .4s'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: i <= step ? 'white' : 'rgba(255,255,255,0.3)', animation: i === step ? 'pulse 1s infinite' : 'none' }} />
          <span style={{ fontSize: 13, color: i <= step ? 'white' : 'rgba(255,255,255,0.4)' }}>{s}</span>
        </div>
      ))}
    </div>
  )
}
