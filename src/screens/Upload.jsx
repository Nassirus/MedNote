import { useState, useRef } from 'react'
import { TYPE_CONFIG } from '../constants'

export default function Upload({ onAddItems }) {
  const [mode, setMode]     = useState('text')
  const [text, setText]     = useState('')
  const [fileName, setFileName] = useState('')
  const [step, setStep]     = useState('idle')   // idle | analyzing | preview | done
  const [preview, setPreview] = useState([])
  const [err, setErr]       = useState('')
  const fileRef = useRef()

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = ev => { setText(ev.target.result); setMode('text') }
    reader.readAsText(f)
  }

  async function analyze() {
    const content = text.trim()
    if (!content) { setErr('Введите или загрузите текст'); return }
    setStep('analyzing'); setErr('')
    try {
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPreview((data.items || []).map((x, i) => ({ ...x, id: Date.now() + i, done: false, sel: true })))
    } catch (e) {
      setErr('Ошибка анализа: ' + e.message)
      setStep('idle'); return
    }
    setStep('preview')
  }

  function confirm() {
    const confirmed = preview.filter(i => i.sel).map(({ sel, ...r }) => r)
    onAddItems(confirmed)
    setStep('done')
  }

  function reset() { setStep('idle'); setPreview([]); setText(''); setFileName('') }

  if (step === 'done') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header"><h1 style={{ fontWeight: 700, fontSize: 18 }}>ИИ-анализ</h1></div>
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>🎉</div>
        <h2 style={{ fontWeight: 700, fontSize: 22, color: 'var(--text)' }}>Добавлено в расписание!</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>Назначения добавлены. Перейди в «Сегодня» или «Календарь».</p>
        <button className="btn btn-primary" onClick={reset} style={{ padding: '11px 24px' }}>Анализировать ещё</button>
      </div>
    </div>
  )

  if (step === 'analyzing') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header"><h1 style={{ fontWeight: 700, fontSize: 18 }}>ИИ-анализ</h1></div>
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, border: '4px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
        <h2 style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>Gemini анализирует...</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
          {['Распознаю текст документа', 'Извлекаю назначения врача', 'Определяю дозировки и расписание', 'Формирую план лечения'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', animation: `pulse ${1 + i * 0.3}s infinite` }} />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (step === 'preview') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h1 style={{ fontWeight: 700, fontSize: 18 }}>Найдено назначений</h1>
        <button className="btn btn-ghost" onClick={reset} style={{ fontSize: 13 }}>← Назад</button>
      </div>
      <div className="page-content">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Снимите галочку с ненужных пунктов, затем нажмите «Добавить»</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {preview.map(item => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
            return (
              <div key={item.id} onClick={() => setPreview(p => p.map(i => i.id === item.id ? { ...i, sel: !i.sel } : i))}
                className="schedule-item" style={{ cursor: 'pointer', opacity: item.sel ? 1 : 0.45, border: `1.5px solid ${item.sel ? cfg.color : 'var(--border)'}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{cfg.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{item.time} · {item.freq}</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: item.sel ? cfg.color : 'transparent', border: `2px solid ${item.sel ? cfg.color : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.sel && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                </div>
              </div>
            )
          })}
        </div>
        <button className="btn btn-primary" onClick={confirm} style={{ width: '100%', padding: 13, fontSize: 15 }}>
          Добавить {preview.filter(i => i.sel).length} пункт(а) в расписание →
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h1 style={{ fontWeight: 700, fontSize: 18 }}>ИИ-анализ документов</h1>
      </div>
      <div className="page-content">
        {/* Info banner */}
        <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Gemini AI</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3, lineHeight: 1.5 }}>
              Загрузите выписку, рецепт или план лечения. ИИ извлечёт все назначения и автоматически составит расписание.
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 3, marginBottom: 18 }}>
          {[['text', '📋 Вставить текст'], ['file', '📎 Загрузить файл']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '9px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13,
              background: mode === m ? 'white' : 'transparent',
              color: mode === m ? 'var(--primary)' : 'var(--text3)',
              boxShadow: mode === m ? 'var(--shadow)' : 'none', transition: 'all .15s'
            }}>{l}</button>
          ))}
        </div>

        {mode === 'file' ? (
          <div>
            <div onClick={() => fileRef.current.click()} style={{
              border: '2px dashed var(--primary-border)', borderRadius: 14, padding: '36px 20px',
              textAlign: 'center', cursor: 'pointer', background: fileName ? 'var(--primary-light)' : 'white',
              transition: 'all .15s', marginBottom: 14
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>{fileName ? '📄' : '⬆️'}</div>
              {fileName ? (
                <>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>{fileName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Текст загружен и готов к анализу</div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text2)' }}>Нажмите, чтобы выбрать файл</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>TXT, PDF (текстовый)</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label className="label">Текст выписки или назначений</label>
            <textarea className="input" value={text} onChange={e => setText(e.target.value)}
              placeholder={"Вставьте текст назначений...\n\nПример:\nАспирин 100мг — утром после еды\nМетформин 500мг — 2 раза в день\nЕжедневные прогулки 30 минут\nИзмерение давления утром и вечером\nКонтрольный визит через 2 недели"}
              rows={10} style={{ resize: 'vertical', lineHeight: 1.7 }} />
          </div>
        )}

        {err && <div style={{ background: 'var(--danger-light)', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 13px', fontSize: 13, color: 'var(--danger)', marginBottom: 14 }}>{err}</div>}

        <button className="btn btn-primary" onClick={analyze} disabled={!text.trim()} style={{ width: '100%', padding: 13, fontSize: 15 }}>
          🤖 Анализировать с Gemini AI
        </button>

        {/* Tips */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Что умеет ИИ</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
            {[['💊', 'Препараты и дозировки'],['🏃', 'Упражнения и нагрузки'],['🩺', 'Процедуры'],['📅', 'Плановые визиты'],['⚠️', 'Ограничения'],['🥗', 'Диета и питание']].map(([e, t]) => (
              <div key={t} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{e}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
