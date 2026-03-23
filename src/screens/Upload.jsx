import { useState, useRef } from 'react'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { minsToTime, timeToMins } from '../lib/dateUtils'
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isBefore } from 'date-fns'
import { ru } from 'date-fns/locale'

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.heic,.pdf,.txt,.doc,.docx'
const IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/heic','image/heif']
const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

// ── Mini calendar for date picking ──────────────────────────────────
function MiniCalendar({ selected, onChange }) {
  const [month, setMonth] = useState(new Date())
  const start = startOfWeek(startOfMonth(month), { weekStartsOn:1 })
  const end   = endOfWeek(endOfMonth(month), { weekStartsOn:1 })
  const days  = eachDayOfInterval({ start, end })
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <button onClick={() => setMonth(p => new Date(p.getFullYear(),p.getMonth()-1,1))}
          style={{ background:'var(--surface2)', border:'none', borderRadius:7, width:26, height:26, fontSize:14, cursor:'pointer' }}>‹</button>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', textTransform:'capitalize' }}>
          {format(month,'LLLL yyyy',{locale:ru})}
        </span>
        <button onClick={() => setMonth(p => new Date(p.getFullYear(),p.getMonth()+1,1))}
          style={{ background:'var(--surface2)', border:'none', borderRadius:7, width:26, height:26, fontSize:14, cursor:'pointer' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
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
              aspectRatio:'1', borderRadius:6, border:'none', fontSize:11,
              fontWeight: isSel || isT ? 700 : 400,
              background: isSel ? 'var(--primary)' : isT ? 'var(--primary-light)' : 'transparent',
              color: isSel ? 'white' : isT ? 'var(--primary)' : isCur ? 'var(--text)' : 'var(--text3)',
              opacity: isPast ? 0.3 : 1, cursor: isPast ? 'not-allowed' : 'pointer'
            }}>{format(day,'d')}</button>
          )
        })}
      </div>
    </div>
  )
}

// ── Schedule Wizard for items without time/freq ──────────────────────
function ScheduleWizard({ item, onSave, onSkip }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const [time, setTime] = useState(item.time || '08:00')
  const [freq, setFreq] = useState(item.freq || 'Ежедневно')
  const [scheduleType, setScheduleType] = useState(item.freq ? 'recurring' : 'choose')
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(null)

  function save() {
    const updates = { time, freq: scheduleType === 'recurring' ? freq : 'Разово', date: null }
    if (scheduleType === 'once') {
      updates.date = format(startDate, 'yyyy-MM-dd')
      updates.freq = 'Разово'
    } else if (scheduleType === 'course' && endDate) {
      updates.freq = `Курс до ${format(endDate,'d MMM',{locale:ru})}`
    }
    onSave(updates)
  }

  return (
    <div style={{ background:'white', border:'2px solid var(--primary)', borderRadius:14, padding:16, marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{cfg.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{item.title}</div>
          {item.dose && <div style={{ fontSize:11, color:'var(--primary)', fontWeight:600 }}>{item.dose}</div>}
        </div>
        <button onClick={onSkip} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:18, cursor:'pointer', padding:4 }}>✕</button>
      </div>

      <div style={{ fontSize:12, fontWeight:700, color:'var(--primary)', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>
        ⚠️ Уточните расписание
      </div>

      {/* Schedule type */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:12 }}>
        {[['recurring','🔄 Регулярно'],['once','📅 Разово'],['course','📆 Курс']].map(([k,l]) => (
          <button key={k} onClick={() => setScheduleType(k)} style={{
            padding:'7px 4px', borderRadius:8, border:`1.5px solid ${scheduleType===k?'var(--primary)':'var(--border)'}`,
            background: scheduleType===k ? 'var(--primary-light)' : 'white',
            fontSize:11, fontWeight:600, color: scheduleType===k ? 'var(--primary)' : 'var(--text3)', cursor:'pointer'
          }}>{l}</button>
        ))}
      </div>

      {/* Time */}
      <div style={{ marginBottom:12 }}>
        <div className="label">Время приёма</div>
        <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
      </div>

      {/* Recurring freq */}
      {scheduleType === 'recurring' && (
        <div style={{ marginBottom:12 }}>
          <div className="label">Частота</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {['Ежедневно','По будням','Раз в 2 дня','Раз в неделю','2 раза в день'].map(f => (
              <button key={f} onClick={() => setFreq(f)} style={{
                padding:'5px 10px', borderRadius:20, border:'none', fontSize:11, fontWeight:600, cursor:'pointer',
                background: freq===f ? 'var(--primary)' : 'var(--surface2)',
                color: freq===f ? 'white' : 'var(--text3)'
              }}>{f}</button>
            ))}
          </div>
        </div>
      )}

      {/* Once — pick date */}
      {scheduleType === 'once' && (
        <div style={{ marginBottom:12 }}>
          <div className="label">Дата</div>
          <MiniCalendar selected={startDate} onChange={setStartDate} />
          {startDate && <div style={{ fontSize:12, color:'var(--primary)', fontWeight:600, marginTop:6, textAlign:'center' }}>
            📅 {format(startDate,'d MMMM yyyy',{locale:ru})}
          </div>}
        </div>
      )}

      {/* Course — start + end date */}
      {scheduleType === 'course' && (
        <div style={{ marginBottom:12 }}>
          <div className="label">Дата начала</div>
          <MiniCalendar selected={startDate} onChange={setStartDate} />
          {startDate && <div style={{ fontSize:12, color:'var(--primary)', fontWeight:600, marginTop:4, marginBottom:8, textAlign:'center' }}>
            Начало: {format(startDate,'d MMM',{locale:ru})}
          </div>}
          <div className="label">Дата окончания</div>
          <MiniCalendar selected={endDate} onChange={setEndDate} />
          {endDate && <div style={{ fontSize:12, color:'var(--success)', fontWeight:600, marginTop:4, textAlign:'center' }}>
            Конец: {format(endDate,'d MMM',{locale:ru})}
          </div>}
        </div>
      )}

      <button onClick={save} className="btn btn-primary" style={{ width:'100%', fontSize:13 }}>
        ✓ Подтвердить расписание
      </button>
    </div>
  )
}

// ── Inline item editor ───────────────────────────────────────────────
function ItemEditor({ item, onChange }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const [open, setOpen] = useState(false)

  if (!open) return (
    <div onClick={() => setOpen(true)}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px',
        background: item.sel ? 'white' : 'var(--surface2)',
        borderRadius:12, border:`1.5px solid ${item.sel ? cfg.color : 'var(--border)'}`,
        opacity: item.sel ? 1 : 0.45, cursor:'pointer', transition:'all .15s' }}>
      <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>{cfg.icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, display:'flex', gap:8, flexWrap:'wrap' }}>
          {item.time && <span>⏰ {item.time}{item.endTime?' → '+item.endTime:''}</span>}
          {item.freq && <span>🔄 {item.freq}</span>}
          {item.dose && <span style={{ color:cfg.color, fontWeight:600 }}>{item.dose}</span>}
          {item.needs_schedule && <span style={{ color:'var(--warning)', fontWeight:700 }}>⚠️ нет расписания</span>}
          {item.confidence === 'low' && <span style={{ color:'var(--warning)' }}>❓ неточно</span>}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
        <div style={{ width:20, height:20, borderRadius:'50%', background: item.sel ? cfg.color : 'transparent',
          border:`2px solid ${item.sel ? cfg.color : 'var(--border2)'}`,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => { e.stopPropagation(); onChange({ ...item, sel: !item.sel }) }}>
          {item.sel && <span style={{ color:'white', fontSize:11 }}>✓</span>}
        </div>
        <div style={{ fontSize:11, color:'var(--text3)' }}>✏️</div>
      </div>
    </div>
  )

  // Expanded edit mode
  return (
    <div style={{ background:'white', borderRadius:12, border:`2px solid ${cfg.color}`,
      padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>{cfg.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color:cfg.color }}>{cfg.label}</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ background:'var(--surface2)', border:'none', borderRadius:'50%', width:28, height:28, fontSize:14, cursor:'pointer' }}>✕</button>
      </div>

      <div>
        <div className="label">Название</div>
        <input className="input" value={item.title} onChange={e => onChange({ ...item, title: e.target.value })} />
      </div>

      {item.dose !== undefined && (
        <div>
          <div className="label">Дозировка</div>
          <input className="input" value={item.dose || ''} placeholder="Например: 500мг, 1 таблетка"
            onChange={e => onChange({ ...item, dose: e.target.value })} />
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div>
          <div className="label">Начало</div>
          <input type="time" className="input" value={item.time || '08:00'}
            onChange={e => onChange({ ...item, time: e.target.value })} />
        </div>
        <div>
          <div className="label">Конец</div>
          <input type="time" className="input" value={item.endTime || ''}
            onChange={e => onChange({ ...item, endTime: e.target.value })} />
        </div>
      </div>

      <div>
        <div className="label">Частота</div>
        <select className="input" value={item.freq || ''} onChange={e => onChange({ ...item, freq: e.target.value })}>
          <option value="">— не задано —</option>
          <option>Ежедневно</option>
          <option>2 раза в день</option>
          <option>3 раза в день</option>
          <option>По будням</option>
          <option>Раз в 2 дня</option>
          <option>Раз в неделю</option>
          <option>Разово</option>
        </select>
      </div>

      <div>
        <div className="label">Примечание</div>
        <input className="input" value={item.notes || ''} placeholder="Доп. информация..."
          onChange={e => onChange({ ...item, notes: e.target.value })} />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onChange({ ...item, sel: false })} className="btn btn-danger" style={{ flex:1, fontSize:12 }}>
          Убрать
        </button>
        <button onClick={() => setOpen(false)} className="btn btn-primary" style={{ flex:2, fontSize:12 }}>
          ✓ Готово
        </button>
      </div>
    </div>
  )
}

// ── Main Upload component ────────────────────────────────────────────
export default function Upload({ onAddItems }) {
  const [mode, setMode]     = useState('photo')
  const [text, setText]     = useState('')
  const [file, setFile]     = useState(null)
  const [step, setStep]     = useState('idle')   // idle | analyzing | preview | wizard | done
  const [preview, setPreview] = useState([])
  const [wizardIdx, setWizardIdx] = useState(0)  // index in preview needing schedule
  const [err, setErr]       = useState('')
  const fileRef             = useRef()

  // Compress image to stay well under Vercel 4.5MB body limit.
  // Target: base64 < 800KB (= ~600KB image) — Gemini reads text fine at 800px.
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)

        function toJpeg(srcEl, maxPx, q) {
          let w = srcEl.width  || srcEl.naturalWidth  || maxPx
          let h = srcEl.height || srcEl.naturalHeight || maxPx
          if (w > maxPx || h > maxPx) {
            if (w > h) { h = Math.round(h * maxPx / w); w = maxPx }
            else       { w = Math.round(w * maxPx / h); h = maxPx }
          }
          const cv = document.createElement('canvas')
          cv.width = w; cv.height = h
          cv.getContext('2d').drawImage(srcEl, 0, 0, w, h)
          return cv.toDataURL('image/jpeg', q)
        }

        // Try progressively smaller until base64 < 800KB
        const attempts = [
          [800, 0.7],
          [640, 0.6],
          [512, 0.5],
          [400, 0.4],
        ]
        let result = ''
        for (const [px, q] of attempts) {
          result = toJpeg(img, px, q)
          // base64 section only (strip prefix) must be < 800KB
          const b64len = result.split(',')[1]?.length || result.length
          if (b64len < 800 * 1024) break
        }
        resolve(result)
      }
      img.onerror = () => reject(new Error('Не удалось загрузить изображение'))
      img.src = url
    })
  }

  async function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setErr('')
    e.target.value = ''

    const ext = f.name.split('.').pop().toLowerCase()
    const imageExts = ['jpg','jpeg','png','webp','heic','heif','bmp','gif','tiff']
    const isImage = IMAGE_TYPES.includes(f.type) || imageExts.includes(ext)

    if (isImage) {
      try {
        // Compress via Canvas — reduces 5MB photo to ~200KB
        const dataUrl = await compressImage(f)
        const base64  = dataUrl.split(',')[1]
        setFile({ name: f.name, base64, mimeType: 'image/jpeg', preview: dataUrl, isImage: true })
        setMode('photo')
      } catch (err) {
        // Fallback: read raw bytes (for formats Canvas can't decode like some HEICs)
        try {
          const buf   = await f.arrayBuffer()
          const bytes = new Uint8Array(buf)
          // Encode in chunks to avoid call stack overflow on large files
          const CHUNK = 8192
          let binary  = ''
          for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
          }
          const base64 = btoa(binary)
          const ext2   = f.name.split('.').pop().toLowerCase()
          const mimeMap = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png',
            webp:'image/webp', heic:'image/jpeg', heif:'image/jpeg' }
          const mimeType = mimeMap[ext2] || 'image/jpeg'
          // Preview will fail for HEIC but base64 is sent to Gemini
          setFile({ name: f.name, base64, mimeType, preview: null, isImage: true })
          setMode('photo')
        } catch {
          setErr('Не удалось прочитать изображение. Попробуйте сделать скриншот и загрузить его.')
        }
      }
    } else {
      const reader = new FileReader()
      reader.onload = ev => {
        setText(ev.target.result)
        setFile({ name: f.name, isImage: false })
        setMode('text')
      }
      reader.onerror = () => setErr('Не удалось прочитать файл')
      reader.readAsText(f)
    }
  }

  async function analyze() {
    const hasContent = mode === 'photo' ? file?.base64 : text.trim()
    if (!hasContent) { setErr('Загрузите файл или введите текст'); return }
    setStep('analyzing'); setErr('')
    try {
      const body = file?.isImage
        ? { imageBase64: file.base64, mimeType: file.mimeType }
        : { text: text.trim() }
      const bodyStr = JSON.stringify(body)
      const bodySizeKB = Math.round(bodyStr.length / 1024)
      console.log(`[analyze] sending ${bodySizeKB}KB`)
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      })
      // Guard: Vercel returns HTML on 413/502/etc — check content-type first
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('json')) {
        const txt = await res.text()
        if (res.status === 413 || bodySizeKB > 3000) {
          throw new Error('Файл слишком большой для отправки. Попробуйте сделать скриншот экрана с документом и загрузить его.')
        }
        throw new Error(`Ошибка сервера ${res.status}. Попробуйте снова.`)
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const items = (data.items || []).map((x, i) => ({ ...x, id: Date.now() + i, done: false, sel: true }))
      if (items.length === 0) throw new Error('Назначения для домашнего выполнения не найдены.')
      setPreview(items)
    } catch (e) {
      setErr(e.message); setStep('idle'); return
    }
    setStep('preview')
  }

  function updateItem(updated) {
    setPreview(p => p.map(i => i.id === updated.id ? updated : i))
  }

  // Find items that need schedule wizard
  function getWizardItems() {
    return preview.filter(i => i.sel && (i.needs_schedule || !i.freq || !i.time))
  }

  function startWizard() {
    const needsSchedule = getWizardItems()
    if (needsSchedule.length === 0) { confirmAll(); return }
    setWizardIdx(0)
    setStep('wizard')
  }

  function wizardSave(updates) {
    const item = getWizardItems()[wizardIdx]
    setPreview(p => p.map(i => i.id === item.id ? { ...i, ...updates, needs_schedule: false } : i))
    const remaining = getWizardItems().filter(i => i.id !== item.id)
    if (remaining.length > 0) {
      setWizardIdx(0) // recalculate after state update
    } else {
      confirmAll()
    }
  }

  function wizardSkip() {
    const item = getWizardItems()[wizardIdx]
    // Mark as skipped (set default values)
    setPreview(p => p.map(i => i.id === item.id ? { ...i, time: i.time || '08:00', freq: i.freq || 'Ежедневно', needs_schedule: false } : i))
    const remaining = getWizardItems().filter(i => i.id !== item.id)
    if (remaining.length === 0) confirmAll()
  }

  function confirmAll() {
    const selected = preview
      .filter(i => i.sel)
      .map(({ sel, needs_schedule, confidence, dose, ...rest }) => ({
        ...rest,
        notes: [rest.notes, dose].filter(Boolean).join(' · ') || '',
        time:  rest.time  || '08:00',
        freq:  rest.freq  || 'Ежедневно',
        date:  rest.date  || null,
      }))
    onAddItems(selected)
    setStep('done')
  }

  function reset() {
    setStep('idle'); setPreview([]); setText(''); setFile(null); setErr('')
  }

  const selectedCount = preview.filter(i => i.sel).length
  const wizardItems   = getWizardItems()

  // ── DONE ──
  if (step === 'done') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="page-header"><h1 style={{ fontWeight:700, fontSize:18 }}>ИИ-анализ</h1></div>
      <div className="page-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, textAlign:'center' }}>
        <div style={{ fontSize:60 }}>🎉</div>
        <h2 style={{ fontWeight:700, fontSize:20, color:'var(--text)' }}>Добавлено в расписание!</h2>
        <p style={{ color:'var(--text3)', fontSize:13, maxWidth:280 }}>Перейдите в «Сегодня» или «Календарь»</p>
        <button className="btn btn-primary" onClick={reset} style={{ padding:'11px 28px' }}>Анализировать ещё</button>
      </div>
    </div>
  )

  // ── ANALYZING ──
  if (step === 'analyzing') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="page-header"><h1 style={{ fontWeight:700, fontSize:18 }}>ИИ-анализ</h1></div>
      <div className="page-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, textAlign:'center' }}>
        <div style={{ width:52, height:52, border:'4px solid var(--primary-border)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin .9s linear infinite' }} />
        <h2 style={{ fontWeight:700, fontSize:17, color:'var(--text)' }}>Gemini 2.5 анализирует...</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:7, width:'100%', maxWidth:300 }}>
          {['Читаю документ', 'Отфильтровываю стационарные процедуры', 'Ищу домашние назначения', 'Определяю дозировки и расписание'].map((s,i) => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--primary)', animation:`pulse ${1+i*0.25}s infinite` }} />
              <span style={{ fontSize:12, color:'var(--text2)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── WIZARD ──
  if (step === 'wizard' && wizardItems.length > 0) {
    const currentItem = wizardItems[0]
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div className="page-header">
          <div>
            <h1 style={{ fontWeight:700, fontSize:17 }}>Уточните расписание</h1>
            <p style={{ fontSize:11, color:'var(--text3)' }}>Пункт {wizardIdx+1} из {wizardItems.length + wizardIdx}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setStep('preview')} style={{ fontSize:12 }}>← Назад</button>
        </div>
        <div className="page-content">
          <div style={{ background:'var(--primary-light)', border:'1px solid var(--primary-border)', borderRadius:10, padding:'11px 14px', marginBottom:16, fontSize:13, color:'var(--primary)', lineHeight:1.6 }}>
            💊 В документе не указано точное расписание для этого пункта. Задайте его сами.
          </div>
          <ScheduleWizard
            item={currentItem}
            onSave={wizardSave}
            onSkip={wizardSkip}
          />
        </div>
      </div>
    )
  }

  // ── PREVIEW ──
  if (step === 'preview') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontWeight:700, fontSize:17 }}>Проверьте назначения</h1>
          <p style={{ fontSize:11, color:'var(--text3)' }}>Нажмите на пункт для редактирования</p>
        </div>
        <button className="btn btn-ghost" onClick={reset} style={{ fontSize:12 }}>← Назад</button>
      </div>
      <div className="page-content">

        {/* Summary banner */}
        <div style={{ background:'var(--success-light)', border:'1px solid #A7F3D0', borderRadius:10, padding:'11px 14px', marginBottom:14, fontSize:13, color:'var(--success)', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>🏠</span>
          <div>
            <strong>Только домашние назначения</strong>
            <div style={{ fontSize:11, marginTop:2 }}>Стационарные процедуры автоматически исключены</div>
          </div>
        </div>

        {/* Warning for needs_schedule */}
        {preview.some(i => i.sel && (i.needs_schedule || !i.freq)) && (
          <div style={{ background:'var(--warning-light)', border:'1px solid #FDE68A', borderRadius:10, padding:'11px 14px', marginBottom:14, fontSize:12, color:'#92400E', lineHeight:1.6 }}>
            ⚠️ Некоторые пункты не имеют расписания. На следующем шаге вы зададите их вручную.
          </div>
        )}

        {/* Item list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
          {preview.map(item => (
            <ItemEditor key={item.id} item={item} onChange={updateItem} />
          ))}
        </div>

        {/* Confirm button */}
        <button
          className="btn btn-primary"
          onClick={startWizard}
          disabled={selectedCount === 0}
          style={{ width:'100%', padding:13, fontSize:14, opacity: selectedCount===0 ? 0.5 : 1 }}>
          {wizardItems.length > 0
            ? `Далее: задать расписание (${wizardItems.length}) →`
            : `Добавить ${selectedCount} пункт(а) в календарь →`}
        </button>
      </div>
    </div>
  )

  // ── IDLE ──
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="page-header">
        <h1 style={{ fontWeight:700, fontSize:17 }}>ИИ-анализ выписки</h1>
      </div>
      <div className="page-content">
        <div style={{ background:'var(--primary-light)', border:'1px solid var(--primary-border)', borderRadius:12, padding:'13px 16px', marginBottom:16, display:'flex', gap:12 }}>
          <span style={{ fontSize:20 }}>🤖</span>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--primary)' }}>Gemini 2.5 Flash</div>
            <div style={{ fontSize:12, color:'var(--text2)', marginTop:2, lineHeight:1.5 }}>
              Извлекает только домашние назначения. Стационарные процедуры автоматически исключаются.
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display:'flex', background:'var(--surface2)', borderRadius:10, padding:3, marginBottom:14 }}>
          {[['photo','📸 Фото'],['text','📋 Текст']].map(([m,l]) => (
            <button key={m} onClick={() => { setMode(m); setFile(null); setText(''); setErr('') }} style={{
              flex:1, padding:'9px', borderRadius:8, border:'none', fontWeight:600, fontSize:13,
              background: mode===m ? 'white' : 'transparent',
              color: mode===m ? 'var(--primary)' : 'var(--text3)',
              boxShadow: mode===m ? 'var(--shadow)' : 'none', transition:'all .15s'
            }}>{l}</button>
          ))}
        </div>

        {mode === 'photo' ? (
          <>
            {file?.base64 ? (
              <div style={{ marginBottom:14, position:'relative' }}>
                {file.preview
                  ? <img src={file.preview} alt="Preview" style={{ width:'100%', maxHeight:240, objectFit:'contain', borderRadius:12, border:'1px solid var(--border)', background:'var(--surface2)' }} />
                  : <div style={{ background:'var(--surface2)', borderRadius:12, border:'1px solid var(--border)', padding:'28px 16px', textAlign:'center' }}>
                      <div style={{ fontSize:36, marginBottom:8 }}>📄</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>{file.name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Готово к анализу</div>
                    </div>
                }
                <button onClick={() => { setFile(null); setErr('') }} style={{
                  position:'absolute', top:8, right:8, width:28, height:28, borderRadius:'50%',
                  background:'rgba(0,0,0,0.5)', border:'none', color:'white', fontSize:14, cursor:'pointer' }}>✕</button>
                {file.preview && <div style={{ marginTop:6, fontSize:12, color:'var(--text3)', textAlign:'center' }}>📎 {file.name}</div>}
              </div>
            ) : (
              <div onClick={() => fileRef.current.click()} style={{
                border:'2px dashed var(--primary-border)', borderRadius:14, padding:'36px 20px',
                textAlign:'center', cursor:'pointer', background:'white', marginBottom:14, transition:'all .15s'
              }}>
                <div style={{ fontSize:40, marginBottom:10 }}>📸</div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text2)' }}>Нажмите для загрузки</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:6, lineHeight:1.6 }}>
                  Фото выписки, рецепта, плана лечения<br/>JPG, PNG · Рукописные документы поддерживаются
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFile} style={{ display:'none' }} />
          </>
        ) : (
          <div style={{ marginBottom:14 }}>
            {file && !file.isImage && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--primary-light)', borderRadius:8, marginBottom:8 }}>
                <span>📄</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--primary)', flex:1 }}>{file.name}</span>
                <button onClick={() => { setFile(null); setText('') }} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}>✕</button>
              </div>
            )}
            <div className="label">Текст выписки</div>
            <textarea className="input" value={text} onChange={e => setText(e.target.value)}
              placeholder={'Вставьте текст выписки...\n\nНапример:\nАспирин 100мг — утром после еды\nМетформин 500мг — 2 раза в день\nПрогулки 30 мин ежедневно'}
              rows={9} style={{ resize:'vertical', lineHeight:1.7 }} />
            <button onClick={() => fileRef.current.click()} className="btn btn-ghost" style={{ marginTop:8, width:'100%', fontSize:13 }}>
              📎 Загрузить файл
            </button>
            <input ref={fileRef} type="file" accept=".txt,.doc,.docx,.pdf" onChange={handleFile} style={{ display:'none' }} />
          </div>
        )}

        {err && (
          <div style={{ background:'var(--danger-light)', border:'1px solid #FECACA', borderRadius:9, padding:'10px 13px', fontSize:13, color:'var(--danger)', marginBottom:14, lineHeight:1.5 }}>
            {err}
          </div>
        )}

        <button className="btn btn-primary" onClick={analyze}
          disabled={mode==='photo' ? !file?.base64 : !text.trim()}
          style={{ width:'100%', padding:13, fontSize:14, opacity:(mode==='photo'?!file?.base64:!text.trim())?0.5:1 }}>
          🤖 Анализировать с Gemini AI
        </button>

        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>Что распознаёт ИИ</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:7 }}>
            {[['💊','Препараты и дозы'],['🏃','Упражнения, ЛФК'],['🩺','Домашние процедуры'],['📅','Визиты к врачу'],['⚠️','Ограничения'],['🥗','Диета']].map(([e,t]) => (
              <div key={t} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, padding:'8px 10px', display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:16 }}>{e}</span>
                <span style={{ fontSize:11, color:'var(--text2)', fontWeight:500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
