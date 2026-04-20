import { useState, useRef } from 'react'
import { analyzeWithGemini } from '../lib/geminiClient'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import {
  format, addDays, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, isBefore
} from 'date-fns'
import { ru } from 'date-fns/locale'

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.heic,.pdf,.txt,.doc,.docx'
const IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/heic','image/heif']
const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

// ── MiniCalendar ─────────────────────────────────────────────────────
function MiniCalendar({ selected, onChange }) {
  const [month, setMonth] = useState(selected || new Date())
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  })
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <button onClick={() => setMonth(p => new Date(p.getFullYear(), p.getMonth()-1, 1))}
          style={{ background:'white', border:'1px solid var(--border)', borderRadius:6, width:26, height:26, fontSize:14, cursor:'pointer' }}>‹</button>
        <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', textTransform:'capitalize' }}>
          {format(month, 'LLLL yyyy', { locale: ru })}
        </span>
        <button onClick={() => setMonth(p => new Date(p.getFullYear(), p.getMonth()+1, 1))}
          style={{ background:'white', border:'1px solid var(--border)', borderRadius:6, width:26, height:26, fontSize:14, cursor:'pointer' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:3 }}>
        {DOW.map(d => <div key={d} style={{ textAlign:'center', fontSize:9, fontWeight:700, color:'var(--text3)' }}>{d}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {days.map(day => {
          const isPast = isBefore(day, addDays(new Date(), -1))
          const isSel  = selected && isSameDay(day, selected)
          const isT    = isToday(day)
          const isCur  = day.getMonth() === month.getMonth()
          return (
            <button key={day.toISOString()} onClick={() => !isPast && onChange(day)} style={{
              aspectRatio:'1', borderRadius:5, border:'none', fontSize:11,
              fontWeight: isSel || isT ? 700 : 400,
              background: isSel ? 'var(--primary)' : isT ? 'var(--primary-light)' : 'transparent',
              color: isSel ? 'white' : isT ? 'var(--primary)' : isCur ? 'var(--text)' : 'var(--text3)',
              opacity: isPast ? 0.3 : 1, cursor: isPast ? 'not-allowed' : 'pointer'
            }}>{format(day, 'd')}</button>
          )
        })}
      </div>
    </div>
  )
}

// ── Preview card for a single AI-extracted item ──────────────────────
function PreviewCard({ item, onChange }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState(new Date())

  // Compute summary text
  const summary = []
  if (item.time_slots?.length > 1) {
    summary.push(`⏰ ${item.time_slots.join(', ')}`)
  } else if (item.time_slots?.[0]) {
    summary.push(`⏰ ${item.time_slots[0]}`)
  }
  if (item.duration_days) summary.push(`📆 ${item.duration_days} дн.`)
  else if (!item.is_one_time) summary.push('🔄 Ежедневно')
  if (item.is_one_time) summary.push('📅 Разово')
  if (item.dose) summary.push(item.dose)

  if (!open) return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:10, padding:'11px 13px',
      background: item.sel ? 'white' : 'var(--surface2)',
      borderRadius:12, border:`1px solid ${item.sel ? cfg.color+'44' : 'var(--border)'}`,
      borderLeft:`4px solid ${item.sel ? cfg.color : 'var(--border2)'}`,
      opacity: item.sel ? 1 : 0.4, boxShadow: item.sel ? 'var(--shadow)' : 'none'
    }}>
      <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>{cfg.icon}</div>
      <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => setOpen(true)}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {item.title}{item.dose ? ` — ${item.dose}` : ''}
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:3, display:'flex', gap:6, flexWrap:'wrap' }}>
          {summary.map((s,i) => <span key={i}>{s}</span>)}
          {item.confidence === 'low' && <span style={{ color:'var(--warning)', fontWeight:600 }}>❓ неточно</span>}
          {item.needs_date && <span style={{ background:'var(--warning-light)', color:'var(--warning)', padding:'1px 6px', borderRadius:10, fontWeight:700 }}>📅 нужна дата</span>}
        </div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>✏️ нажмите для редактирования</div>
      </div>
      {/* Toggle */}
      <button onClick={() => onChange({ ...item, sel: !item.sel })} style={{
        width:24, height:24, borderRadius:'50%', border:`2px solid ${item.sel ? cfg.color : 'var(--border2)'}`,
        background: item.sel ? cfg.color : 'white', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center', marginTop:2
      }}>
        {item.sel && <span style={{ color:'white', fontSize:10, fontWeight:700 }}>✓</span>}
      </button>
    </div>
  )

  // ── EDIT MODE ──
  return (
    <div style={{ background:'white', borderRadius:12, border:`2px solid ${cfg.color}`, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>{cfg.icon}</span>
          <span style={{ fontSize:11, fontWeight:700, color:cfg.color, textTransform:'uppercase' }}>{cfg.label}</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ background:'var(--surface2)', border:'none', borderRadius:'50%', width:28, height:28, fontSize:15, cursor:'pointer' }}>✕</button>
      </div>

      {/* Title */}
      <div>
        <div className="label">Название</div>
        <input className="input" value={item.title} onChange={e => onChange({ ...item, title: e.target.value })} />
      </div>

      {/* Dose */}
      <div>
        <div className="label">Дозировка</div>
        <input className="input" value={item.dose || ''} placeholder="напр. 500мг, 1 таблетка"
          onChange={e => onChange({ ...item, dose: e.target.value || null })} />
      </div>

      {/* Time slots */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div className="label">Время приёма</div>
          <button onClick={() => onChange({ ...item, time_slots: [...(item.time_slots||['08:00']), '12:00'] })}
            style={{ background:'var(--primary-light)', border:'none', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700, color:'var(--primary)', cursor:'pointer' }}>
            + добавить время
          </button>
        </div>
        {(item.time_slots || ['08:00']).map((t, idx) => (
          <div key={idx} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--primary)', color:'white', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {idx+1}
            </div>
            <input type="time" className="input" value={t} style={{ flex:1 }}
              onChange={e => {
                const slots = [...(item.time_slots || [])]
                slots[idx] = e.target.value
                onChange({ ...item, time_slots: slots })
              }} />
            {(item.time_slots||[]).length > 1 && (
              <button onClick={() => onChange({ ...item, time_slots: item.time_slots.filter((_,i)=>i!==idx) })}
                style={{ background:'var(--danger-light)', border:'none', borderRadius:6, width:28, height:28, color:'var(--danger)', fontSize:13, cursor:'pointer', flexShrink:0 }}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Duration */}
      <div>
        <div className="label">Дней курса (0 = ежедневно бессрочно)</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="number" className="input" min={0} max={365} value={item.duration_days || 0}
            onChange={e => onChange({ ...item, duration_days: parseInt(e.target.value) || null })} />
          <div style={{ fontSize:11, color:'var(--text3)', flexShrink:0, minWidth:60 }}>
            {item.duration_days ? `до ${format(addDays(new Date(), item.duration_days-1),'d MMM',{locale:ru})}` : '∞'}
          </div>
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
          {[0,3,5,7,10,14,21,30].map(d => (
            <button key={d} onClick={() => onChange({ ...item, duration_days: d || null })} style={{
              padding:'3px 9px', borderRadius:20, border:'none', fontSize:10, fontWeight:600, cursor:'pointer',
              background: (item.duration_days||0)===d ? 'var(--primary)' : 'var(--surface2)',
              color: (item.duration_days||0)===d ? 'white' : 'var(--text3)'
            }}>{d===0?'∞':d+'д'}</button>
          ))}
        </div>
      </div>

      {/* Start date for course or one-time */}
      {(item.duration_days || item.is_one_time) && (
        <div>
          <div className="label">{item.is_one_time ? 'Дата' : 'Дата начала курса'}</div>
          <MiniCalendar selected={startDate} onChange={d => { setStartDate(d); onChange({ ...item, start_date: format(d,'yyyy-MM-dd') }) }} />
          <div style={{ fontSize:11, color:'var(--primary)', fontWeight:600, marginTop:6, textAlign:'center' }}>
            📅 {format(startDate,'d MMMM yyyy',{locale:ru})}
            {item.duration_days && ` — ${format(addDays(startDate,item.duration_days-1),'d MMMM',{locale:ru})}`}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="label">Примечание</div>
        <input className="input" value={item.notes || ''} placeholder="доп. информация..."
          onChange={e => onChange({ ...item, notes: e.target.value || null })} />
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onChange({ ...item, sel: false })} className="btn btn-danger" style={{ flex:1, fontSize:12 }}>Убрать</button>
        <button onClick={() => setOpen(false)} className="btn btn-primary" style={{ flex:2, fontSize:12 }}>✓ Готово</button>
      </div>
    </div>
  )
}

// ── Main Upload ───────────────────────────────────────────────────────
export default function Upload({ onAddItems }) {
  const [mode, setMode]       = useState('photo')
  const [text, setText]       = useState('')
  const [file, setFile]       = useState(null)
  const [step, setStep]       = useState('idle')
  const [preview, setPreview] = useState([])
  const [err, setErr]         = useState('')
  const fileRef               = useRef()

  // Image compression
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        function toJpeg(src, px, q) {
          let w = src.naturalWidth||src.width||px, h = src.naturalHeight||src.height||px
          if (w>px||h>px) { if(w>h){h=Math.round(h*px/w);w=px}else{w=Math.round(w*px/h);h=px} }
          const cv=document.createElement('canvas'); cv.width=w; cv.height=h
          cv.getContext('2d').drawImage(src,0,0,w,h)
          return cv.toDataURL('image/jpeg',q)
        }
        let result=''
        // No Vercel timeout anymore (direct API call) — max quality for OCR
        // Target 1.5MB: high quality medical text recognition
        for(const[px,q] of [[1600,0.92],[1400,0.88],[1200,0.85],[1000,0.80]]){
          result=toJpeg(img,px,q)
          if((result.split(',')[1]?.length||0)<1500*1024) break
        }
        resolve(result)
      }
      img.onerror=()=>reject(new Error('Не удалось загрузить'))
      img.src=url
    })
  }

  async function handleFile(e) {
    const f=e.target.files[0]; if(!f) return
    setErr(''); e.target.value=''
    const ext=f.name.split('.').pop().toLowerCase()
    const isImage=IMAGE_TYPES.includes(f.type)||['jpg','jpeg','png','webp','heic','heif','bmp','tiff'].includes(ext)
    if(isImage){
      try {
        const url=await compressImage(f)
        setFile({name:f.name,base64:url.split(',')[1],mimeType:'image/jpeg',preview:url,isImage:true})
        setMode('photo')
      } catch {
        try {
          const buf=await f.arrayBuffer(); const bytes=new Uint8Array(buf)
          const CHUNK=8192; let bin=''
          for(let i=0;i<bytes.length;i+=CHUNK) bin+=String.fromCharCode(...bytes.subarray(i,i+CHUNK))
          const mm={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/jpeg',heif:'image/jpeg'}
          setFile({name:f.name,base64:btoa(bin),mimeType:mm[ext]||'image/jpeg',preview:null,isImage:true})
          setMode('photo')
        } catch { setErr('Не удалось прочитать изображение. Сделайте скриншот.') }
      }
    } else {
      const reader=new FileReader()
      reader.onload=ev=>{setText(ev.target.result);setFile({name:f.name,isImage:false});setMode('text')}
      reader.readAsText(f)
    }
  }

  async function analyze() {
    const hasContent=mode==='photo'?file?.base64:text.trim()
    if(!hasContent){setErr('Загрузите файл или введите текст');return}
    setStep('analyzing'); setErr('')
    try {
      const lang = navigator.language?.startsWith('kk') ? 'kk' : 'ru'
      const hasClientKey = !!import.meta.env.VITE_GEMINI_API_KEY

      let rawItems
      if (hasClientKey) {
        // Direct browser → Gemini (no Vercel timeout)
        rawItems = await analyzeWithGemini({
          imageBase64: file?.isImage ? file.base64 : undefined,
          mimeType:    file?.isImage ? file.mimeType : undefined,
          text:        !file?.isImage ? text.trim() : undefined,
          lang,
          onProgress:  msg => console.log(msg),
        })
      } else {
        // Fallback: server-side via Vercel (may timeout for large photos)
        const body = file?.isImage ? {imageBase64:file.base64, mimeType:file.mimeType, lang} : {text:text.trim(), lang}
        const res = await fetch('/api/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)})
        const ct = res.headers.get('content-type')||''
        if (!ct.includes('json')) {
          if (res.status===413) throw new Error('Файл слишком большой. Сделайте скриншот.')
          throw new Error('Ошибка сервера '+res.status)
        }
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ошибка анализа')
        rawItems = data.items || []
      }

      // Convert raw items to preview format
      const items = (rawItems || []).map((x, i) => ({
        ...x,
        id: Date.now() + i,
        sel: true,
        start_date: format(new Date(), 'yyyy-MM-dd'),
      }))
      if (items.length === 0) throw new Error('Назначения не найдены. Попробуйте сфотографировать чётче или вставьте текст выписки.')
      setPreview(items)
      setStep('preview')
    } catch(e) { setErr(e.message); setStep('idle') }
  }

  function updateItem(updated) {
    setPreview(p=>p.map(i=>i.id===updated.id?updated:i))
  }

  // ── Expand preview items into actual calendar entries ──
  function confirmAll() {
    const result = []

    for (const item of preview.filter(i=>i.sel)) {
      const {sel,id,confidence,times_per_day,...base} = item
      const slots     = base.time_slots?.length ? base.time_slots : ['08:00']
      const startDate = base.start_date ? new Date(base.start_date.replace(/-/g,'/')) : new Date()
      const notesStr  = [base.notes, base.dose].filter(Boolean).join(' · ') || ''

      if (base.is_one_time) {
        // One-time event: one entry per time slot, on the specific date
        for (const t of slots) {
          result.push({
            type:   base.type,
            title:  base.title,
            time:   t,
            endTime: null,
            notes:  notesStr,
            freq:   'Разово',
            date:   format(startDate, 'yyyy-MM-dd'),
            color:  null,
            done:   false,
          })
        }
      } else if (base.duration_days) {
        // Course: create one entry per day × per time slot
        for (let d = 0; d < base.duration_days; d++) {
          const dayDate = format(addDays(startDate, d), 'yyyy-MM-dd')
          for (const t of slots) {
            result.push({
              type:   base.type,
              title:  base.title,
              time:   t,
              endTime: null,
              notes:  notesStr,
              freq:   'Разово',
              date:   dayDate,
              color:  null,
              done:   false,
            })
          }
        }
      } else {
        // Recurring (no end date): one entry per time slot, date: null
        for (const t of slots) {
          result.push({
            type:   base.type,
            title:  base.title,
            time:   t,
            endTime: null,
            notes:  notesStr,
            freq:   'Ежедневно',
            date:   null,
            color:  null,
            done:   false,
          })
        }
      }
    }

    onAddItems(result)
    setStep('done')
  }

  function reset() {
    setStep('idle'); setPreview([]); setText(''); setFile(null); setErr('')
  }

  const selectedCount = preview.filter(i=>i.sel).length

  // DONE
  if(step==='done') return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="page-header"><h1 style={{fontWeight:700,fontSize:17}}>ИИ-анализ</h1></div>
      <div className="page-content" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,textAlign:'center'}}>
        <div style={{fontSize:56}}>🎉</div>
        <h2 style={{fontWeight:700,fontSize:20,color:'var(--text)'}}>Добавлено в расписание!</h2>
        <p style={{color:'var(--text3)',fontSize:13,maxWidth:280}}>Перейдите в «Сегодня» или «Календарь»</p>
        <button className="btn btn-primary" onClick={reset} style={{padding:'11px 28px'}}>Анализировать ещё</button>
      </div>
    </div>
  )

  // ANALYZING
  if(step==='analyzing') return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="page-header"><h1 style={{fontWeight:700,fontSize:17}}>ИИ-анализ</h1></div>
      <div className="page-content" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,textAlign:'center'}}>
        <div style={{width:52,height:52,border:'4px solid var(--primary-border)',borderTopColor:'var(--primary)',borderRadius:'50%',animation:'spin .9s linear infinite'}}/>
        <h2 style={{fontWeight:700,fontSize:16,color:'var(--text)'}}>Gemini анализирует...</h2>
        <div style={{display:'flex',flexDirection:'column',gap:6,width:'100%',maxWidth:300}}>
          {['Читаю документ','Фильтрую стационарные назначения','Определяю дозировки и курсы','Строю расписание приёмов'].map((s,i)=>(
            <div key={s} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'white',border:'1px solid var(--border)',borderRadius:9}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'var(--primary)',animation:`pulse ${1+i*0.3}s infinite`,flexShrink:0}}/>
              <span style={{fontSize:12,color:'var(--text2)'}}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // PREVIEW
  if(step==='preview') return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="page-header">
        <div>
          <h1 style={{fontWeight:700,fontSize:16}}>Проверьте назначения</h1>
          <p style={{fontSize:11,color:'var(--text3)'}}>Нажмите на пункт для редактирования</p>
        </div>
        <button className="btn btn-ghost" onClick={reset} style={{fontSize:12}}>← Назад</button>
      </div>
      <div className="page-content">

        <div style={{background:'var(--success-light)',border:'1px solid #A7F3D0',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'var(--success)',display:'flex',gap:10}}>
          <span style={{fontSize:18}}>🏠</span>
          <div><strong>Только домашние назначения</strong><br/><span style={{fontSize:11,opacity:0.8}}>Курсы разбиты по дням · Несколько приёмов → отдельные записи</span></div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
          {preview.map(item=>(
            <PreviewCard key={item.id} item={item} onChange={updateItem}/>
          ))}
        </div>

        {/* Summary */}
        {selectedCount > 0 && (
          <div style={{background:'var(--primary-light)',border:'1px solid var(--primary-border)',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'var(--primary)'}}>
            ℹ️ Будет создано ~{preview.filter(i=>i.sel).reduce((sum,i)=>{
              const slots=i.time_slots?.length||1
              const days=i.is_one_time?1:i.duration_days||1
              return sum+(i.duration_days||i.is_one_time?days*slots:slots)
            },0)} записей в календаре
          </div>
        )}

        <button className="btn btn-primary" onClick={confirmAll} disabled={selectedCount===0}
          style={{width:'100%',padding:13,fontSize:14,opacity:selectedCount===0?0.5:1}}>
          ✓ Добавить {selectedCount} назначений в календарь
        </button>
      </div>
    </div>
  )

  // IDLE
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="page-header">
        <h1 style={{fontWeight:700,fontSize:17}}>ИИ-анализ выписки</h1>
      </div>
      <div className="page-content">
        <div style={{background:'var(--primary-light)',border:'1px solid var(--primary-border)',borderRadius:12,padding:'12px 15px',marginBottom:14,display:'flex',gap:10}}>
          <span style={{fontSize:18}}>🤖</span>
          <div>
            <div style={{fontWeight:700,fontSize:13,color:'var(--primary)'}}>Gemini AI — умный анализ</div>
            <div style={{fontSize:11,color:'var(--text2)',marginTop:2,lineHeight:1.5}}>
              Автоматически определяет дозировки, курсы и расписание приёмов.
            </div>
          </div>
        </div>

        <div style={{display:'flex',background:'var(--surface2)',borderRadius:10,padding:3,marginBottom:14}}>
          {[['photo','📸 Фото'],['text','📋 Текст']].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setFile(null);setText('');setErr('')}} style={{
              flex:1,padding:'9px',borderRadius:8,border:'none',fontWeight:600,fontSize:13,
              background:mode===m?'white':'transparent',
              color:mode===m?'var(--primary)':'var(--text3)',
              boxShadow:mode===m?'var(--shadow)':'none',transition:'all .15s'
            }}>{l}</button>
          ))}
        </div>

        {mode==='photo' ? (
          <>
            {file?.base64 ? (
              <div style={{marginBottom:14,position:'relative'}}>
                {file.preview
                  ? <img src={file.preview} alt="preview" style={{width:'100%',maxHeight:220,objectFit:'contain',borderRadius:12,border:'1px solid var(--border)',background:'var(--surface2)'}}/>
                  : <div style={{background:'var(--surface2)',borderRadius:12,border:'1px solid var(--border)',padding:'24px 16px',textAlign:'center'}}>
                      <div style={{fontSize:32,marginBottom:6}}>📄</div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text2)'}}>{file.name}</div>
                      <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Готово к анализу</div>
                    </div>
                }
                <button onClick={()=>{setFile(null);setErr('')}} style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:'50%',background:'rgba(0,0,0,0.5)',border:'none',color:'white',fontSize:14,cursor:'pointer'}}>✕</button>
              </div>
            ) : (
              <div onClick={()=>fileRef.current.click()} style={{border:'2px dashed var(--primary-border)',borderRadius:14,padding:'32px 20px',textAlign:'center',cursor:'pointer',background:'white',marginBottom:14}}>
                <div style={{fontSize:38,marginBottom:8}}>📸</div>
                <div style={{fontWeight:700,fontSize:14,color:'var(--text2)'}}>Нажмите для загрузки</div>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:6,lineHeight:1.6}}>Фото выписки, рецепта<br/>JPG, PNG, HEIC</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFile} style={{display:'none'}}/>
          </>
        ) : (
          <div style={{marginBottom:14}}>
            <textarea className="input" value={text} onChange={e=>setText(e.target.value)}
              placeholder={'Вставьте текст выписки...\n\nПример:\nАспирин 100мг — утром после еды, 14 дней\nЛФК — ежедневно 30 минут\nМетформин 500мг — 2 раза в день, 1 месяц\nВизит к терапевту через 2 недели'}
              rows={9} style={{resize:'vertical',lineHeight:1.7}}/>
            <button onClick={()=>fileRef.current.click()} className="btn btn-ghost" style={{marginTop:8,width:'100%',fontSize:13}}>📎 Загрузить файл</button>
            <input ref={fileRef} type="file" accept=".txt,.doc,.docx,.pdf" onChange={handleFile} style={{display:'none'}}/>
          </div>
        )}

        {err&&(
          <div style={{background:'var(--danger-light)',border:'1px solid #FECACA',borderRadius:9,padding:'10px 12px',fontSize:13,color:'var(--danger)',marginBottom:12,lineHeight:1.5}}>{err}</div>
        )}

        <button className="btn btn-primary" onClick={analyze}
          disabled={mode==='photo'?!file?.base64:!text.trim()}
          style={{width:'100%',padding:13,fontSize:14,opacity:(mode==='photo'?!file?.base64:!text.trim())?0.5:1}}>
          🤖 Анализировать с Gemini AI
        </button>
      </div>
    </div>
  )
}
