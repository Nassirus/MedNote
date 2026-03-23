import { useState, useRef } from 'react'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { minsToTime, timeToMins } from '../lib/dateUtils'
import {
  format, addDays, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, isBefore, parseISO
} from 'date-fns'
import { ru } from 'date-fns/locale'

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.heic,.pdf,.txt,.doc,.docx'
const IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/heic','image/heif']
const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

// ── Helpers ──────────────────────────────────────────────────────────
function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

// Generate array of date strings for a course
function generateCourseDates(startDate, durationDays) {
  if (!startDate || !durationDays) return []
  const dates = []
  for (let i = 0; i < durationDays; i++) {
    dates.push(format(addDays(startDate, i), 'yyyy-MM-dd'))
  }
  return dates
}

// ── MiniCalendar ─────────────────────────────────────────────────────
function MiniCalendar({ selected, onChange, allowPast = false }) {
  const [month, setMonth] = useState(selected || new Date())
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 })
  const days  = eachDayOfInterval({ start, end })
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
        <button onClick={() => setMonth(p => new Date(p.getFullYear(), p.getMonth()-1, 1))}
          style={{ background:'white', border:'1px solid var(--border)', borderRadius:7, width:28, height:28, fontSize:14, cursor:'pointer' }}>‹</button>
        <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', textTransform:'capitalize' }}>
          {format(month, 'LLLL yyyy', { locale: ru })}
        </span>
        <button onClick={() => setMonth(p => new Date(p.getFullYear(), p.getMonth()+1, 1))}
          style={{ background:'white', border:'1px solid var(--border)', borderRadius:7, width:28, height:28, fontSize:14, cursor:'pointer' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {DOW.map(d => <div key={d} style={{ textAlign:'center', fontSize:9, fontWeight:700, color:'var(--text3)', padding:'2px 0' }}>{d}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {days.map(day => {
          const isPast = !allowPast && isBefore(day, addDays(new Date(), -1))
          const isSel  = selected && isSameDay(day, selected)
          const isT    = isToday(day)
          const isCur  = day.getMonth() === month.getMonth()
          return (
            <button key={day.toISOString()} onClick={() => !isPast && onChange(day)} style={{
              aspectRatio:'1', borderRadius:6, border:'none', fontSize:11,
              fontWeight: isSel || isT ? 700 : 400,
              background: isSel ? 'var(--primary)' : isT ? 'var(--primary-light)' : 'transparent',
              color: isSel ? 'white' : isT ? 'var(--primary)' : isCur ? 'var(--text)' : 'var(--text3)',
              opacity: isPast ? 0.3 : 1, cursor: isPast ? 'not-allowed' : 'pointer', transition:'all .1s'
            }}>{format(day, 'd')}</button>
          )
        })}
      </div>
    </div>
  )
}

// ── ScheduleWizard ───────────────────────────────────────────────────
// Handles items where AI couldn't determine schedule.
// Also shows auto-detected schedules for user confirmation.
function ScheduleWizard({ item, onSave, onSkip }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine

  // Detect if it's a course item
  const isCourse = !!item.duration_days
  const hasTimes = item.freq && ['2 раза в день','3 раза в день'].includes(item.freq)

  // Schedule type state
  const [schedType, setSchedType] = useState(
    item.date ? 'once' : isCourse ? 'course' : item.freq ? 'recurring' : 'recurring'
  )

  // Times — support multiple for multi-dose
  const initTimes = () => {
    const base = item.time || '08:00'
    if (item.freq === '2 раза в день') return [base, '20:00']
    if (item.freq === '3 раза в день') return [base, '13:00', '20:00']
    return [base]
  }
  const [times, setTimes] = useState(initTimes())

  // Frequency
  const [freq, setFreq] = useState(
    item.freq && !['2 раза в день','3 раза в день'].includes(item.freq)
      ? item.freq : 'Ежедневно'
  )

  // Course
  const [startDate, setStartDate] = useState(new Date())
  const [durationDays, setDurationDays] = useState(item.duration_days || 7)

  // Single date (for appointments)
  const [singleDate, setSingleDate] = useState(new Date())

  function updateTime(idx, val) {
    setTimes(p => p.map((t, i) => i === idx ? val : t))
  }
  function addTime() {
    setTimes(p => [...p, '12:00'])
  }
  function removeTime(idx) {
    setTimes(p => p.filter((_, i) => i !== idx))
  }

  function save() {
    if (schedType === 'once') {
      // Single appointment/procedure on chosen date
      onSave({
        time: times[0],
        endTime: item.endTime || null,
        freq: 'Разово',
        date: format(singleDate, 'yyyy-MM-dd'),
        courseDates: null,
        times: null,
      })
      return
    }

    if (schedType === 'course') {
      // Multi-day course — expand into dates array
      const dates = generateCourseDates(startDate, durationDays)
      onSave({
        times,                        // array of times
        time: times[0],
        endTime: item.endTime || null,
        freq: 'Ежедневно',
        date: null,
        courseDates: dates,           // will be expanded in confirmAll
        duration_days: durationDays,
      })
      return
    }

    // Recurring — no specific end date
    onSave({
      times,
      time: times[0],
      endTime: item.endTime || null,
      freq,
      date: null,
      courseDates: null,
    })
  }

  const endPreview = durationDays > 0
    ? format(addDays(startDate, durationDays - 1), 'd MMM yyyy', { locale: ru })
    : '—'

  return (
    <div style={{ background:'white', border:'2px solid var(--primary)', borderRadius:14, padding:16, marginBottom:8 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>{cfg.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{item.title}</div>
          {item.dose && <div style={{ fontSize:11, color:'var(--primary)', fontWeight:600 }}>{item.dose}</div>}
        </div>
        <button onClick={onSkip} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:18, cursor:'pointer' }}>✕</button>
      </div>

      {/* Schedule type tabs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:14 }}>
        {[['recurring','🔄 Регулярно'],['course','📆 Курс'],['once','📅 Разово']].map(([k,l]) => (
          <button key={k} onClick={() => setSchedType(k)} style={{
            padding:'8px 4px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
            border:`2px solid ${schedType===k ? 'var(--primary)' : 'var(--border)'}`,
            background: schedType===k ? 'var(--primary)' : 'white',
            color: schedType===k ? 'white' : 'var(--text3)',
          }}>{l}</button>
        ))}
      </div>

      {/* Times — always shown, support multiple */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div className="label">Время приёма</div>
          <button onClick={addTime} style={{ background:'var(--primary-light)', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700, color:'var(--primary)', cursor:'pointer' }}>
            + время
          </button>
        </div>
        {times.map((t, idx) => (
          <div key={idx} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--primary)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
              {idx + 1}
            </div>
            <input type="time" className="input" value={t}
              onChange={e => updateTime(idx, e.target.value)}
              style={{ flex:1 }} />
            {times.length > 1 && (
              <button onClick={() => removeTime(idx)} style={{ background:'var(--danger-light)', border:'none', borderRadius:6, width:28, height:28, color:'var(--danger)', fontSize:14, cursor:'pointer', flexShrink:0 }}>✕</button>
            )}
          </div>
        ))}
        {times.length > 1 && (
          <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center' }}>
            Будет создано {times.length} отдельных записи с разным временем
          </div>
        )}
      </div>

      {/* RECURRING */}
      {schedType === 'recurring' && (
        <div style={{ marginBottom:14 }}>
          <div className="label" style={{ marginBottom:8 }}>Повторение</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {['Ежедневно','По будням','По выходным','Раз в 2 дня','Раз в неделю'].map(f => (
              <button key={f} onClick={() => setFreq(f)} style={{
                padding:'6px 12px', borderRadius:20, border:'none', fontSize:11, fontWeight:600, cursor:'pointer',
                background: freq===f ? 'var(--primary)' : 'var(--surface2)',
                color: freq===f ? 'white' : 'var(--text3)',
              }}>{f}</button>
            ))}
          </div>
        </div>
      )}

      {/* COURSE */}
      {schedType === 'course' && (
        <div style={{ marginBottom:14 }}>
          {/* Duration */}
          <div style={{ marginBottom:12 }}>
            <div className="label">Количество дней</div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
              <button onClick={() => setDurationDays(p => Math.max(1, p-1))}
                style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', fontSize:16, cursor:'pointer' }}>−</button>
              <div style={{ flex:1, textAlign:'center', fontWeight:800, fontSize:22, color:'var(--primary)' }}>{durationDays}</div>
              <button onClick={() => setDurationDays(p => p+1)}
                style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', fontSize:16, cursor:'pointer' }}>+</button>
            </div>
            {/* Quick presets */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
              {[3,5,7,10,14,21,30].map(d => (
                <button key={d} onClick={() => setDurationDays(d)} style={{
                  padding:'4px 10px', borderRadius:20, border:'none', fontSize:11, fontWeight:600, cursor:'pointer',
                  background: durationDays===d ? 'var(--primary)' : 'var(--surface2)',
                  color: durationDays===d ? 'white' : 'var(--text3)'
                }}>{d} дн.</button>
              ))}
            </div>
          </div>
          {/* Start date */}
          <div className="label" style={{ marginBottom:6 }}>Дата начала</div>
          <MiniCalendar selected={startDate} onChange={setStartDate} />
          {/* Course summary */}
          <div style={{ marginTop:10, padding:'10px 12px', background:'var(--primary-light)', borderRadius:9, border:'1px solid var(--primary-border)' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--primary)' }}>📆 Курс: {durationDays} дней</div>
            <div style={{ fontSize:11, color:'var(--text2)', marginTop:3 }}>
              {format(startDate, 'd MMM', { locale: ru })} — {endPreview}
            </div>
            <div style={{ fontSize:11, color:'var(--text2)', marginTop:1 }}>
              Будет создано {durationDays * times.length} записей
            </div>
          </div>
        </div>
      )}

      {/* ONCE */}
      {schedType === 'once' && (
        <div style={{ marginBottom:14 }}>
          <div className="label" style={{ marginBottom:6 }}>Выберите дату</div>
          <MiniCalendar selected={singleDate} onChange={setSingleDate} />
          <div style={{ marginTop:8, textAlign:'center', fontSize:13, fontWeight:700, color:'var(--primary)' }}>
            📅 {format(singleDate, 'd MMMM yyyy', { locale: ru })}
          </div>
        </div>
      )}

      <button onClick={save} className="btn btn-primary" style={{ width:'100%', padding:11, fontSize:13 }}>
        ✓ Подтвердить
      </button>
    </div>
  )
}

// ── ItemEditor ───────────────────────────────────────────────────────
function ItemEditor({ item, onChange }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const [open, setOpen] = useState(false)
  const [editDate, setEditDate] = useState(item.date ? parseISO(item.date) : new Date())

  // Color from EVENT_COLORS or TYPE_CONFIG
  const icHex = (EVENT_COLORS.find(c => c.id === item.color)?.hex) || cfg.color

  if (!open) return (
    <div onClick={() => setOpen(true)} style={{
      display:'flex', alignItems:'center', gap:10, padding:'11px 13px',
      background: item.sel ? 'white' : 'var(--surface2)',
      borderRadius:12, borderLeft:`4px solid ${item.sel ? icHex : 'var(--border2)'}`,
      border:`1px solid ${item.sel ? icHex+'44' : 'var(--border)'}`,
      opacity: item.sel ? 1 : 0.4, cursor:'pointer', transition:'all .15s',
      boxShadow: item.sel ? 'var(--shadow)' : 'none',
    }}>
      <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>{cfg.icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {item.time && <span>⏰ {item.time}{item.endTime ? '–'+item.endTime : ''}</span>}
          {item.freq && <span>🔄 {item.freq}</span>}
          {item.duration_days && <span style={{ color:'var(--primary)', fontWeight:600 }}>📆 {item.duration_days} дн.</span>}
          {item.dose && <span style={{ color:cfg.color, fontWeight:600 }}>{item.dose}</span>}
          {(item.needs_schedule || (!item.freq && !item.date)) && (
            <span style={{ background:'var(--warning-light)', color:'var(--warning)', padding:'1px 6px', borderRadius:10, fontWeight:700 }}>⚠️ нет расписания</span>
          )}
          {item.confidence === 'low' && <span style={{ color:'var(--text3)' }}>❓</span>}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
        <div style={{ width:22, height:22, borderRadius:'50%',
          background: item.sel ? icHex : 'transparent',
          border:`2px solid ${item.sel ? icHex : 'var(--border2)'}`,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => { e.stopPropagation(); onChange({ ...item, sel: !item.sel }) }}>
          {item.sel && <span style={{ color:'white', fontSize:11 }}>✓</span>}
        </div>
        <span style={{ fontSize:10, color:'var(--text3)' }}>✏️</span>
      </div>
    </div>
  )

  // ── Expanded edit ──
  return (
    <div style={{ background:'white', borderRadius:12, border:`2px solid ${icHex}`, padding:14 }}>
      {/* Edit header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>{cfg.icon}</span>
          <span style={{ fontSize:11, fontWeight:700, color:icHex, textTransform:'uppercase' }}>{cfg.label}</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ background:'var(--surface2)', border:'none', borderRadius:'50%', width:28, height:28, fontSize:15, cursor:'pointer' }}>✕</button>
      </div>

      {/* Title */}
      <div style={{ marginBottom:10 }}>
        <div className="label">Название</div>
        <input className="input" value={item.title} onChange={e => onChange({ ...item, title: e.target.value })} />
      </div>

      {/* Dose */}
      <div style={{ marginBottom:10 }}>
        <div className="label">Дозировка</div>
        <input className="input" value={item.dose || ''} placeholder="напр. 500мг, 1 таблетка"
          onChange={e => onChange({ ...item, dose: e.target.value })} />
      </div>

      {/* Time range */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'flex-end', marginBottom:10 }}>
        <div>
          <div className="label">Начало</div>
          <input type="time" className="input" value={item.time || '08:00'}
            onChange={e => onChange({ ...item, time: e.target.value })} />
        </div>
        <div style={{ color:'var(--text3)', paddingBottom:10, fontSize:16 }}>→</div>
        <div>
          <div className="label">Конец</div>
          <input type="time" className="input" value={item.endTime || ''}
            onChange={e => onChange({ ...item, endTime: e.target.value })} />
        </div>
      </div>

      {/* Frequency */}
      <div style={{ marginBottom:10 }}>
        <div className="label">Частота</div>
        <select className="input" value={item.freq || ''} onChange={e => onChange({ ...item, freq: e.target.value })}>
          <option value="">— не задано —</option>
          <option>Ежедневно</option>
          <option>2 раза в день</option>
          <option>3 раза в день</option>
          <option>По будням</option>
          <option>По выходным</option>
          <option>Раз в 2 дня</option>
          <option>Раз в неделю</option>
          <option>Разово</option>
        </select>
      </div>

      {/* Duration days (course) */}
      <div style={{ marginBottom:10 }}>
        <div className="label">Дней курса (0 = бессрочно)</div>
        <input type="number" className="input" min={0} max={365}
          value={item.duration_days || 0}
          onChange={e => onChange({ ...item, duration_days: Number(e.target.value) || null })} />
      </div>

      {/* Date — for one-time items */}
      {(item.freq === 'Разово' || item.type === 'appointment') && (
        <div style={{ marginBottom:10 }}>
          <div className="label">Дата</div>
          <MiniCalendar selected={editDate} onChange={d => { setEditDate(d); onChange({ ...item, date: format(d, 'yyyy-MM-dd') }) }} />
          <div style={{ fontSize:11, color:'var(--primary)', fontWeight:600, marginTop:6, textAlign:'center' }}>
            📅 {format(editDate, 'd MMMM yyyy', { locale: ru })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom:12 }}>
        <div className="label">Примечание</div>
        <input className="input" value={item.notes || ''} placeholder="Доп. информация..."
          onChange={e => onChange({ ...item, notes: e.target.value })} />
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

  // Image compression via Canvas
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        function toJpeg(src, maxPx, q) {
          let w = src.naturalWidth || src.width || maxPx
          let h = src.naturalHeight || src.height || maxPx
          if (w > maxPx || h > maxPx) {
            if (w > h) { h = Math.round(h * maxPx / w); w = maxPx }
            else       { w = Math.round(w * maxPx / h); h = maxPx }
          }
          const cv = document.createElement('canvas')
          cv.width = w; cv.height = h
          cv.getContext('2d').drawImage(src, 0, 0, w, h)
          return cv.toDataURL('image/jpeg', q)
        }
        let result = ''
        for (const [px, q] of [[800,0.7],[640,0.6],[512,0.5],[400,0.4]]) {
          result = toJpeg(img, px, q)
          if ((result.split(',')[1]?.length || 0) < 800 * 1024) break
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
    setErr(''); e.target.value = ''
    const ext = f.name.split('.').pop().toLowerCase()
    const imageExts = ['jpg','jpeg','png','webp','heic','heif','bmp','gif','tiff']
    const isImage = IMAGE_TYPES.includes(f.type) || imageExts.includes(ext)
    if (isImage) {
      try {
        const dataUrl = await compressImage(f)
        setFile({ name:f.name, base64:dataUrl.split(',')[1], mimeType:'image/jpeg', preview:dataUrl, isImage:true })
        setMode('photo')
      } catch {
        try {
          const buf = await f.arrayBuffer()
          const bytes = new Uint8Array(buf)
          const CHUNK = 8192; let binary = ''
          for (let i = 0; i < bytes.length; i += CHUNK)
            binary += String.fromCharCode(...bytes.subarray(i, i+CHUNK))
          const mimeMap = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/jpeg',heif:'image/jpeg'}
          setFile({ name:f.name, base64:btoa(binary), mimeType:mimeMap[ext]||'image/jpeg', preview:null, isImage:true })
          setMode('photo')
        } catch { setErr('Не удалось прочитать изображение. Сделайте скриншот и загрузите его.') }
      }
    } else {
      const reader = new FileReader()
      reader.onload = ev => { setText(ev.target.result); setFile({ name:f.name, isImage:false }); setMode('text') }
      reader.onerror = () => setErr('Не удалось прочитать файл')
      reader.readAsText(f)
    }
  }

  async function analyze() {
    const hasContent = mode === 'photo' ? file?.base64 : text.trim()
    if (!hasContent) { setErr('Загрузите файл или введите текст'); return }
    setStep('analyzing'); setErr('')
    try {
      const body = file?.isImage ? { imageBase64:file.base64, mimeType:file.mimeType } : { text:text.trim() }
      const bodyStr = JSON.stringify(body)
      const res = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body:bodyStr })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('json')) {
        if (res.status === 413) throw new Error('Файл слишком большой. Сделайте скриншот и загрузите его.')
        throw new Error('Ошибка сервера ' + res.status + '. Попробуйте снова.')
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const items = (data.items || []).map((x, i) => ({ ...x, id: Date.now() + i, sel: true }))
      if (items.length === 0) throw new Error('Домашние назначения не найдены. Попробуйте другой документ.')
      setPreview(items)
      setStep('preview')
    } catch (e) {
      setErr(e.message); setStep('idle')
    }
  }

  function updateItem(updated) {
    setPreview(p => p.map(i => i.id === updated.id ? updated : i))
  }

  // Items that still need schedule input
  function getWizardItems() {
    return preview.filter(i => i.sel && (i.needs_schedule || (!i.freq && !i.date)))
  }

  function startWizard() {
    if (getWizardItems().length === 0) { confirmAll(); return }
    setStep('wizard')
  }

  function wizardSave(updates) {
    const item = getWizardItems()[0]
    setPreview(p => p.map(i => i.id === item.id ? { ...i, ...updates, needs_schedule: false } : i))
    // Check remaining after state update via setTimeout
    setTimeout(() => {
      const remaining = preview
        .map(i => i.id === item.id ? { ...i, ...updates, needs_schedule: false } : i)
        .filter(i => i.sel && (i.needs_schedule || (!i.freq && !i.date)))
      if (remaining.length === 0) confirmAll()
    }, 50)
  }

  function wizardSkip() {
    const item = getWizardItems()[0]
    setPreview(p => p.map(i => i.id === item.id ? { ...i, time: i.time||'08:00', freq: i.freq||'Ежедневно', needs_schedule:false } : i))
  }

  // ── Expand items into calendar entries ──
  function confirmAll() {
    const result = []
    const selected = preview.filter(i => i.sel)

    for (const item of selected) {
      const { sel, needs_schedule, confidence, dose, times, courseDates, duration_days, ...base } = item
      const notesFull = [base.notes, dose].filter(Boolean).join(' · ') || ''
      const cleanBase = { ...base, notes: notesFull, time: base.time || '08:00', freq: base.freq || 'Ежедневно' }

      if (courseDates && courseDates.length > 0) {
        // Course: one entry per day per time
        const timesArr = times && times.length > 0 ? times : [cleanBase.time]
        for (const dateStr of courseDates) {
          for (const t of timesArr) {
            result.push({ ...cleanBase, date: dateStr, time: t, freq: 'Разово', id: undefined })
          }
        }
      } else if (times && times.length > 1) {
        // Multiple times per day recurring
        for (const t of times) {
          result.push({ ...cleanBase, time: t, date: cleanBase.date || null, id: undefined })
        }
      } else {
        result.push({ ...cleanBase, date: cleanBase.date || null })
      }
    }

    onAddItems(result)
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
      <div className="page-header"><h1 style={{ fontWeight:700, fontSize:17 }}>ИИ-анализ</h1></div>
      <div className="page-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, textAlign:'center' }}>
        <div style={{ fontSize:56 }}>🎉</div>
        <h2 style={{ fontWeight:700, fontSize:20, color:'var(--text)' }}>Добавлено в расписание!</h2>
        <p style={{ color:'var(--text3)', fontSize:13, maxWidth:280 }}>Перейдите в «Сегодня» или «Календарь» чтобы проверить</p>
        <button className="btn btn-primary" onClick={reset} style={{ padding:'11px 28px' }}>Анализировать ещё</button>
      </div>
    </div>
  )

  // ── ANALYZING ──
  if (step === 'analyzing') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="page-header"><h1 style={{ fontWeight:700, fontSize:17 }}>ИИ-анализ</h1></div>
      <div className="page-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, textAlign:'center' }}>
        <div style={{ width:52, height:52, border:'4px solid var(--primary-border)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin .9s linear infinite' }} />
        <h2 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>Gemini анализирует...</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:6, width:'100%', maxWidth:300 }}>
          {['Читаю документ','Отфильтровываю стационарные назначения','Определяю домашние процедуры','Составляю расписание'].map((s,i) => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'white', border:'1px solid var(--border)', borderRadius:9 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--primary)', animation:`pulse ${1+i*0.3}s infinite`, flexShrink:0 }} />
              <span style={{ fontSize:12, color:'var(--text2)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── WIZARD ──
  if (step === 'wizard') {
    const cur = wizardItems[0]
    if (!cur) { confirmAll(); return null }
    const allWizard = preview.filter(i => i.sel && (i.needs_schedule || (!i.freq && !i.date)))
    const total = allWizard.length
    const done  = preview.filter(i => i.sel && !i.needs_schedule && (i.freq || i.date)).length

    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div className="page-header">
          <div>
            <h1 style={{ fontWeight:700, fontSize:16 }}>Уточните расписание</h1>
            <p style={{ fontSize:11, color:'var(--text3)' }}>{total} пункт(а) требуют расписания</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setStep('preview')} style={{ fontSize:12 }}>← Назад</button>
        </div>
        <div className="page-content">
          <div style={{ background:'var(--warning-light)', border:'1px solid #FDE68A', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#92400E', lineHeight:1.6 }}>
            💊 В документе не указано точное расписание. Задайте его сами — вы можете изменить это в любой момент.
          </div>
          <ScheduleWizard item={cur} onSave={wizardSave} onSkip={wizardSkip} />
          {total > 1 && (
            <button onClick={confirmAll} className="btn btn-ghost" style={{ width:'100%', marginTop:8, fontSize:12 }}>
              Пропустить остальные и добавить с настройками по умолчанию
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── PREVIEW ──
  if (step === 'preview') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontWeight:700, fontSize:16 }}>Проверьте назначения</h1>
          <p style={{ fontSize:11, color:'var(--text3)' }}>Нажмите на пункт для редактирования</p>
        </div>
        <button className="btn btn-ghost" onClick={reset} style={{ fontSize:12 }}>← Назад</button>
      </div>
      <div className="page-content">
        {/* Home-only banner */}
        <div style={{ background:'var(--success-light)', border:'1px solid #A7F3D0', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12, color:'var(--success)', display:'flex', gap:10 }}>
          <span style={{ fontSize:18 }}>🏠</span>
          <div><strong>Только домашние назначения</strong><br/><span style={{ fontSize:11 }}>Стационарные процедуры исключены автоматически</span></div>
        </div>

        {wizardItems.length > 0 && (
          <div style={{ background:'var(--warning-light)', border:'1px solid #FDE68A', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#92400E' }}>
            ⚠️ {wizardItems.length} пункт(а) без расписания — уточните на следующем шаге
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {preview.map(item => <ItemEditor key={item.id} item={item} onChange={updateItem} />)}
        </div>

        <button className="btn btn-primary" onClick={startWizard} disabled={selectedCount === 0}
          style={{ width:'100%', padding:13, fontSize:14, opacity:selectedCount===0?0.5:1 }}>
          {wizardItems.length > 0
            ? `Далее: задать расписание (${wizardItems.length} пункт.) →`
            : `✓ Добавить ${selectedCount} назначений в календарь`}
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
        <div style={{ background:'var(--primary-light)', border:'1px solid var(--primary-border)', borderRadius:12, padding:'12px 15px', marginBottom:14, display:'flex', gap:10 }}>
          <span style={{ fontSize:18 }}>🤖</span>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--primary)' }}>Gemini AI</div>
            <div style={{ fontSize:11, color:'var(--text2)', marginTop:2, lineHeight:1.5 }}>Находит только домашние назначения. Курсы автоматически разбиваются по дням.</div>
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
                  ? <img src={file.preview} alt="preview" style={{ width:'100%', maxHeight:220, objectFit:'contain', borderRadius:12, border:'1px solid var(--border)', background:'var(--surface2)' }} />
                  : <div style={{ background:'var(--surface2)', borderRadius:12, border:'1px solid var(--border)', padding:'24px 16px', textAlign:'center' }}>
                      <div style={{ fontSize:32, marginBottom:6 }}>📄</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>{file.name}</div>
                    </div>
                }
                <button onClick={() => { setFile(null); setErr('') }} style={{ position:'absolute', top:8, right:8, width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', color:'white', fontSize:14, cursor:'pointer' }}>✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current.click()} style={{ border:'2px dashed var(--primary-border)', borderRadius:14, padding:'32px 20px', textAlign:'center', cursor:'pointer', background:'white', marginBottom:14 }}>
                <div style={{ fontSize:38, marginBottom:8 }}>📸</div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text2)' }}>Нажмите для загрузки</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:6, lineHeight:1.6 }}>Фото выписки, рецепта<br/>JPG, PNG, HEIC</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFile} style={{ display:'none' }} />
          </>
        ) : (
          <div style={{ marginBottom:14 }}>
            <textarea className="input" value={text} onChange={e => setText(e.target.value)}
              placeholder={'Вставьте текст выписки...\n\nНапример:\nАспирин 100мг — утром, 14 дней\nЛФК — ежедневно 30 минут\nВизит к терапевту через 2 недели'}
              rows={9} style={{ resize:'vertical', lineHeight:1.7 }} />
            <button onClick={() => fileRef.current.click()} className="btn btn-ghost" style={{ marginTop:8, width:'100%', fontSize:13 }}>📎 Загрузить файл</button>
            <input ref={fileRef} type="file" accept=".txt,.doc,.docx,.pdf" onChange={handleFile} style={{ display:'none' }} />
          </div>
        )}

        {err && (
          <div style={{ background:'var(--danger-light)', border:'1px solid #FECACA', borderRadius:9, padding:'10px 12px', fontSize:13, color:'var(--danger)', marginBottom:12, lineHeight:1.5 }}>{err}</div>
        )}

        <button className="btn btn-primary" onClick={analyze}
          disabled={mode==='photo' ? !file?.base64 : !text.trim()}
          style={{ width:'100%', padding:13, fontSize:14, opacity:(mode==='photo'?!file?.base64:!text.trim())?0.5:1 }}>
          🤖 Анализировать с Gemini AI
        </button>
      </div>
    </div>
  )
}
