import { useState } from 'react'

export default function Onboarding({ text, setText, onAnalyze, onSkip }) {
  const [mode, setMode] = useState('paste')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0369A1', overflow: 'hidden' }}>
      {/* Hero */}
      <div style={{ padding: '16px 24px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>💊</div>
        <h1 style={{ fontWeight: 800, fontSize: 28, color: 'white', letterSpacing: -0.5 }}>MedSchedule</h1>
        <p style={{ color: '#BAE6FD', fontSize: 13, marginTop: 4 }}>ИИ-помощник по назначениям врача</p>
      </div>

      {/* Card */}
      <div style={{ flex: 1, background: '#F8FAFC', borderRadius: '26px 26px 0 0', marginTop: 18, padding: '20px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 18, color: '#0F172A' }}>Загрузите выписку</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3, lineHeight: 1.5 }}>
            Gemini AI найдёт назначения и создаст расписание
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', background: '#E2E8F0', borderRadius: 10, padding: 3 }}>
          {[['paste', '📋 Текст'], ['upload', '📁 Файл (скоро)']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
              background: mode === m ? 'white' : 'transparent',
              fontWeight: 600, fontSize: 12,
              color: mode === m ? '#0369A1' : '#64748B',
              transition: 'all .15s'
            }}>{l}</button>
          ))}
        </div>

        {mode === 'paste' ? (
          <>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"Вставьте текст назначений...\n\nНапример:\nАспирин 100мг — утром после еды\nМетформин 500мг — 2 раза в день\nЕжедневные прогулки 30 минут\nКонтрольный визит через 2 недели"}
              style={{
                width: '100%', minHeight: 150, padding: 12, border: '1.5px solid #CBD5E1',
                borderRadius: 10, fontSize: 13, resize: 'none', color: '#0F172A',
                background: 'white', lineHeight: 1.6, fontFamily: 'inherit'
              }}
            />
            <button
              onClick={onAnalyze}
              disabled={!text.trim()}
              style={{
                width: '100%', padding: 13,
                background: text.trim() ? '#0369A1' : '#CBD5E1',
                color: 'white', border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 15,
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                transition: 'background .2s'
              }}
            >🤖 Анализировать с Gemini AI</button>
          </>
        ) : (
          <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <p style={{ fontWeight: 600, color: '#64748B', fontSize: 14 }}>В разработке</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Пока используйте вставку текста</p>
          </div>
        )}

        <button onClick={onSkip} style={{
          width: '100%', padding: 11, background: 'transparent',
          color: '#94A3B8', border: '1.5px solid #E2E8F0', borderRadius: 10,
          fontWeight: 600, fontSize: 13
        }}>Смотреть демо →</button>

        <p style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 4 }}>
          Данные обрабатываются через Gemini AI и не хранятся
        </p>
      </div>
    </div>
  )
}
