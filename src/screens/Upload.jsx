import { useState, useRef } from 'react'
import { TYPE_CONFIG } from '../constants'

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.heic,.pdf,.txt,.doc,.docx'
const IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/heic','image/heif']

export default function Upload({ onAddItems }) {
  const [mode, setMode]   = useState('photo')   // photo | text
  const [text, setText]   = useState('')
  const [file, setFile]   = useState(null)       // { name, base64, mimeType, preview }
  const [step, setStep]   = useState('idle')     // idle | analyzing | preview | done
  const [preview, setPreview] = useState([])
  const [err, setErr]     = useState('')
  const fileRef = useRef()

  async function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setErr('')

    const isImage = IMAGE_TYPES.includes(f.type)
    const reader  = new FileReader()

    if (isImage) {
      reader.onload = ev => {
        const full   = ev.target.result           // data:image/jpeg;base64,....
        const base64 = full.split(',')[1]
        const preview = full
        setFile({ name: f.name, base64, mimeType: f.type, preview, isImage: true })
        setMode('photo')
      }
      reader.readAsDataURL(f)
    } else {
      reader.onload = ev => {
        setText(ev.target.result)
        setFile({ name: f.name, isImage: false })
        setMode('text')
      }
      reader.readAsText(f)
    }
    e.target.value = ''
  }

  async function analyze() {
    const hasContent = mode === 'photo' ? file?.base64 : text.trim()
    if (!hasContent) { setErr('Загрузите файл или введите текст'); return }
    setStep('analyzing'); setErr('')

    try {
      const body = file?.isImage
        ? { imageBase64: file.base64, mimeType: file.mimeType }
        : { text: text.trim() }

      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const parsed = (data.items || []).map((x, i) => ({ ...x, id: Date.now() + i, done: false, sel: true }))
      if (parsed.length === 0) throw new Error('Назначения не найдены. Попробуйте другой документ.')
      setPreview(parsed)
    } catch (e) {
      setErr(e.message)
      setStep('idle'); return
    }
    setStep('preview')
  }

  function confirm() {
    onAddItems(preview.filter(i => i.sel).map(({ sel, ...r }) => r))
    setStep('done')
  }

  function reset() {
    setStep('idle'); setPreview([]); setText(''); setFile(null); setErr('')
  }

  if (step === 'done') return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div className="page-header"><h1 style={{ fontWeight:700,fontSize:18 }}>ИИ-анализ</h1></div>
      <div className="page-content" style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,textAlign:'center' }}>
        <div style={{ fontSize:60 }}>🎉</div>
        <h2 style={{ fontWeight:700,fontSize:22,color:'var(--text)' }}>Добавлено в расписание!</h2>
        <p style={{ color:'var(--text3)',fontSize:14,maxWidth:300 }}>Перейдите в «Сегодня» или «Календарь» чтобы просмотреть расписание.</p>
        <button className="btn btn-primary" onClick={reset} style={{ padding:'11px 28px' }}>Анализировать ещё</button>
      </div>
    </div>
  )

  if (step === 'analyzing') return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div className="page-header"><h1 style={{ fontWeight:700,fontSize:18 }}>ИИ-анализ</h1></div>
      <div className="page-content" style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,textAlign:'center' }}>
        <div style={{ width:56,height:56,border:'4px solid var(--primary-border)',borderTopColor:'var(--primary)',borderRadius:'50%',animation:'spin .9s linear infinite' }} />
        <h2 style={{ fontWeight:700,fontSize:18,color:'var(--text)' }}>Gemini анализирует...</h2>
        <div style={{ display:'flex',flexDirection:'column',gap:7,width:'100%',maxWidth:320 }}>
          {(file?.isImage
            ? ['Распознаю изображение','Читаю рукописный текст','Извлекаю назначения','Формирую расписание']
            : ['Читаю текст документа','Нахожу назначения','Определяю дозировки','Формирую расписание']
          ).map((s,i) => (
            <div key={s} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10 }}>
              <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--primary)',animation:`pulse ${1+i*0.25}s infinite` }} />
              <span style={{ fontSize:13,color:'var(--text2)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (step === 'preview') return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontWeight:700,fontSize:18 }}>Найдено назначений</h1>
          <p style={{ fontSize:12,color:'var(--text3)' }}>Снимите галочку с ненужных</p>
        </div>
        <button className="btn btn-ghost" onClick={reset} style={{ fontSize:13 }}>← Назад</button>
      </div>
      <div className="page-content">
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:18 }}>
          {preview.map(item => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
            return (
              <div key={item.id} onClick={() => setPreview(p => p.map(i => i.id===item.id ? {...i,sel:!i.sel} : i))}
                className="schedule-item" style={{ cursor:'pointer',opacity:item.sel?1:0.45,border:`1.5px solid ${item.sel?cfg.color:'var(--border)'}` }}>
                <div style={{ width:40,height:40,borderRadius:10,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{cfg.icon}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:600,fontSize:13,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>{item.time} · {item.freq}</div>
                  {item.notes && <div style={{ fontSize:11,color:'var(--text3)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.notes}</div>}
                </div>
                <div style={{ width:22,height:22,borderRadius:'50%',background:item.sel?cfg.color:'transparent',border:`2px solid ${item.sel?cfg.color:'var(--border2)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  {item.sel && <span style={{ color:'white',fontSize:12 }}>✓</span>}
                </div>
              </div>
            )
          })}
        </div>
        <button className="btn btn-primary" onClick={confirm} style={{ width:'100%',padding:13,fontSize:14 }}>
          Добавить {preview.filter(i=>i.sel).length} пункт(а) в расписание →
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div className="page-header">
        <h1 style={{ fontWeight:700,fontSize:18 }}>ИИ-анализ документов</h1>
      </div>
      <div className="page-content">
        {/* Info */}
        <div style={{ background:'var(--primary-light)',border:'1px solid var(--primary-border)',borderRadius:12,padding:'13px 16px',marginBottom:18,display:'flex',gap:12 }}>
          <span style={{ fontSize:22 }}>🤖</span>
          <div>
            <div style={{ fontWeight:700,fontSize:14,color:'var(--primary)' }}>Gemini AI Vision</div>
            <div style={{ fontSize:12,color:'var(--text2)',marginTop:2,lineHeight:1.5 }}>Поддерживаются фото, сканы, рукописные документы и текстовые файлы.</div>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display:'flex',background:'var(--surface2)',borderRadius:10,padding:3,marginBottom:16 }}>
          {[['photo','📸 Фото / Скан'],['text','📋 Текст']].map(([m,l]) => (
            <button key={m} onClick={() => { setMode(m); setFile(null); setText(''); setErr('') }} style={{
              flex:1,padding:'9px',borderRadius:8,border:'none',fontWeight:600,fontSize:13,
              background:mode===m?'white':'transparent',color:mode===m?'var(--primary)':'var(--text3)',
              boxShadow:mode===m?'var(--shadow)':'none',transition:'all .15s'
            }}>{l}</button>
          ))}
        </div>

        {/* Photo mode */}
        {mode === 'photo' && (
          <>
            {file?.preview ? (
              <div style={{ marginBottom:14,position:'relative' }}>
                <img src={file.preview} alt="Preview" style={{ width:'100%',maxHeight:260,objectFit:'contain',borderRadius:12,border:'1px solid var(--border)',background:'var(--surface2)' }} />
                <button onClick={() => { setFile(null); setErr('') }} style={{
                  position:'absolute',top:8,right:8,width:28,height:28,borderRadius:'50%',
                  background:'rgba(0,0,0,0.5)',border:'none',color:'white',fontSize:14,cursor:'pointer'
                }}>✕</button>
                <div style={{ marginTop:8,fontSize:12,color:'var(--text3)',textAlign:'center' }}>📎 {file.name}</div>
              </div>
            ) : (
              <div onClick={() => fileRef.current.click()} style={{
                border:'2px dashed var(--primary-border)',borderRadius:14,padding:'40px 20px',
                textAlign:'center',cursor:'pointer',background:'white',marginBottom:14,
                transition:'all .15s'
              }}
                onMouseEnter={e => e.currentTarget.style.background='var(--primary-light)'}
                onMouseLeave={e => e.currentTarget.style.background='white'}>
                <div style={{ fontSize:44,marginBottom:10 }}>📸</div>
                <div style={{ fontWeight:700,fontSize:15,color:'var(--text2)' }}>Нажмите для загрузки</div>
                <div style={{ fontSize:12,color:'var(--text3)',marginTop:6,lineHeight:1.6 }}>
                  Фото выписки, рецепта или плана лечения<br/>
                  JPG, PNG, WEBP · Рукописные документы поддерживаются
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFile} style={{ display:'none' }} />
          </>
        )}

        {/* Text mode */}
        {mode === 'text' && (
          <div style={{ marginBottom:14 }}>
            {file && !file.isImage && (
              <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--primary-light)',borderRadius:8,marginBottom:8 }}>
                <span>📄</span>
                <span style={{ fontSize:12,fontWeight:600,color:'var(--primary)' }}>{file.name}</span>
                <button onClick={() => { setFile(null); setText('') }} style={{ marginLeft:'auto',background:'none',border:'none',color:'var(--text3)',cursor:'pointer' }}>✕</button>
              </div>
            )}
            <label className="label">Текст назначений</label>
            <textarea className="input" value={text} onChange={e => setText(e.target.value)}
              placeholder={"Вставьте текст выписки...\n\nПример:\nАспирин 100мг — утром после еды\nМетформин 500мг — 2 раза в день\nПрогулки 30 мин ежедневно\nКонтрольный визит через 2 недели"}
              rows={10} style={{ resize:'vertical',lineHeight:1.7 }} />
            <button onClick={() => fileRef.current.click()} className="btn btn-ghost" style={{ marginTop:8,width:'100%',fontSize:13 }}>
              📎 Загрузить текстовый файл
            </button>
            <input ref={fileRef} type="file" accept=".txt,.doc,.docx,.pdf" onChange={handleFile} style={{ display:'none' }} />
          </div>
        )}

        {err && (
          <div style={{ background:'var(--danger-light)',border:'1px solid #FECACA',borderRadius:9,padding:'10px 13px',fontSize:13,color:'var(--danger)',marginBottom:14,lineHeight:1.5 }}>{err}</div>
        )}

        <button className="btn btn-primary" onClick={analyze}
          disabled={mode==='photo' ? !file?.base64 : !text.trim()}
          style={{ width:'100%',padding:13,fontSize:15,opacity:(mode==='photo'?!file?.base64:!text.trim())?0.5:1 }}>
          🤖 Анализировать с Gemini AI
        </button>

        {/* Supported formats */}
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text3)',marginBottom:10,textTransform:'uppercase',letterSpacing:0.5 }}>Поддерживаемые форматы</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:7 }}>
            {[['📸','Фото выписки'],['🖊️','Рукописный текст'],['📄','PDF документ'],['📝','TXT файл'],['💊','Рецепты'],['🏥','Истории болезни']].map(([e,t]) => (
              <div key={t} style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:9,padding:'9px 11px',display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontSize:17 }}>{e}</span>
                <span style={{ fontSize:12,color:'var(--text2)',fontWeight:500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
