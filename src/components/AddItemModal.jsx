import { useState } from 'react'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { TypeIcon, IconRefresh, IconCalendar } from '../components/Icons'
import { minsToTime, timeToMins } from '../lib/dateUtils'
import {
  format, addDays, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, isBefore
} from 'date-fns'
import { ru } from 'date-fns/locale'

const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function defaultEnd(startTime, minutes = 60) {
  const mins = timeToMins(startTime) + minutes
  return minsToTime(mins)
}

export default function AddItemModal({
  onAdd, onClose,
  defaultDate, defaultTime, defaultEndTime,
  existingItems = []
}) {
  const initCustom = !!defaultDate
  const startT = defaultTime || '08:00'
  const endT   = defaultEndTime || defaultEnd(startT, 60)

  const [step, setStep]     = useState(1)
  const [type, setType]     = useState('medication')
  const [title, setTitle]   = useState('')
  const [time, setTime]     = useState(startT)
  const [endTime, setEndTime] = useState(endT)
  const [notes, setNotes]   = useState('')
  const [color, setColor]   = useState('blue')
  // Default: 'custom' = specific date (not 'daily' = all days forever)
  const [recurring, setRecurring] = useState('custom')
  const [freq, setFreq]     = useState('Ежедневно')
  // Default dates: provided date OR today
  const [dates, setDates]   = useState(defaultDate ? [defaultDate] : [new Date()])
  const [month, setMonth]   = useState(defaultDate || new Date())
  const [err, setErr]       = useState('')
  const [conflict, setConflict] = useState(null)
  const [conflictChoice, setConflictChoice] = useState(null)

  const cfg      = TYPE_CONFIG[type] || TYPE_CONFIG.medication
  const selColor = EVENT_COLORS.find(c => c.id === color) || EVENT_COLORS[0]

  const calStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const calEnd   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const calDays  = eachDayOfInterval({ start: calStart, end: calEnd })

  // Duration display
  const durationMins = Math.max(15, timeToMins(endTime) - timeToMins(time))
  const durationLabel = durationMins >= 60
    ? `${Math.floor(durationMins/60)} ч ${durationMins%60 ? durationMins%60 + ' мин' : ''}`
    : `${durationMins} мин`

  function onStartChange(t) {
    setTime(t)
    // Keep duration constant when start changes
    const dur = Math.max(15, timeToMins(endTime) - timeToMins(time))
    setEndTime(minsToTime(timeToMins(t) + dur))
    const c = existingItems.find(i => i.time === t && !i.date)
    setConflict(c || null)
    setConflictChoice(null)
    setErr('')
  }

  function onEndChange(t) {
    // Ensure endTime > startTime
    if (timeToMins(t) <= timeToMins(time)) {
      setEndTime(minsToTime(timeToMins(time) + 15))
    } else {
      setEndTime(t)
    }
  }

  function suggestFree() {
    const used = new Set(existingItems.map(i => i.time))
    const [h, m] = time.split(':').map(Number)
    for (let d = 15; d <= 120; d += 15) {
      const nt = minsToTime(h*60 + m + d)
      if (!used.has(nt)) return nt
    }
    return null
  }

  function toggleDate(day) {
    if (isBefore(day, addDays(new Date(), -1))) return
    setDates(p => p.some(d => isSameDay(d,day)) ? p.filter(d => !isSameDay(d,day)) : [...p,day])
    setErr('')
  }

  function next() {
    if (!title.trim()) { setErr('Введите название'); return }
    if (conflict && !conflictChoice) { setErr('Выберите действие при пересечении времени'); return }
    setErr('')
    setStep(2)
  }

  function submit() {
    if (recurring === 'custom' && dates.length === 0) { setErr('Выберите хотя бы одну дату'); return }

    const finalTime    = (conflictChoice === 'shift' && conflict) ? (suggestFree() || time) : time
    const finalEndTime = (conflictChoice === 'shift' && conflict)
      ? minsToTime(timeToMins(suggestFree() || time) + durationMins)
      : endTime

    const base = { type, title: title.trim(), time: finalTime, endTime: finalEndTime, notes, color, freq }

    if (recurring === 'daily') {
      onAdd({ ...base, date: null })
    } else {
      dates.sort((a,b) => a-b).forEach(d => {
        onAdd({ ...base, date: format(d, 'yyyy-MM-dd'), freq: 'Разово' })
      })
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}
        style={{ maxHeight:'92dvh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {step === 2 && (
              <button onClick={() => { setStep(1); setErr('') }}
                style={{ background:'var(--surface2)', border:'none', borderRadius:8, width:30, height:30, fontSize:16 }}>←</button>
            )}
            <h3 style={{ fontWeight:700, fontSize:17, color:'var(--text)' }}>
              {step === 1 ? 'Новое событие' : 'Когда?'}
            </h3>
          </div>
          <button onClick={onClose}
            style={{ background:'var(--surface2)', border:'none', borderRadius:'50%', width:30, height:30, fontSize:15, color:'var(--text2)' }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[1,2].map(s => (
            <div key={s} style={{ flex:1, height:3, borderRadius:99,
              background: s<=step ? selColor.hex : 'var(--border)', transition:'all .2s' }} />
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Type grid */}
            <div>
              <div className="label" style={{ marginBottom:8 }}>Тип события</div>
              <div className="type-grid">
                {Object.entries(TYPE_CONFIG).map(([k,v]) => (
                  <button key={k} onClick={() => setType(k)} style={{
                    padding:'10px 4px', borderRadius:10,
                    border:`2px solid ${type===k ? v.color : 'var(--border)'}`,
                    background: type===k ? v.bg : 'var(--surface2)',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    transition:'all .15s'
                  }}>
                    <TypeIcon type={k} size={20} color={type===k ? v.color : 'var(--text3)'}/>
                    <span style={{ fontSize:9, fontWeight:700, color: type===k ? v.color : 'var(--text3)', textAlign:'center' }}>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <div className="label">Название *</div>
              <input className="input" value={title}
                onChange={e => { setTitle(e.target.value); setErr('') }}
                placeholder={`Например: ${cfg.label}...`} autoFocus />
            </div>

            {/* Time range */}
            <div>
              <div className="label" style={{ marginBottom:8 }}>Время</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Начало</div>
                  <input type="time" className="input" value={time} onChange={e => onStartChange(e.target.value)} />
                </div>
                <div style={{ color:'var(--text3)', fontSize:20, paddingTop:16 }}>→</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Конец</div>
                  <input type="time" className="input" value={endTime} onChange={e => onEndChange(e.target.value)} />
                </div>
              </div>
              <div style={{ fontSize:11, color: selColor.hex, fontWeight:600, marginTop:5, textAlign:'center' }}>
                ⏱ Продолжительность: {durationLabel}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <div className="label" style={{ marginBottom:8 }}>Цвет</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {EVENT_COLORS.map(c => (
                  <button key={c.id} onClick={() => setColor(c.id)} title={c.id} style={{
                    width:28, height:28, borderRadius:'50%', background:c.hex,
                    border:'none', cursor:'pointer',
                    boxShadow: color===c.id ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : 'none',
                    transition:'all .15s'
                  }} />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="label">Заметка</div>
              <input className="input" value={notes}
                onChange={e => setNotes(e.target.value)} placeholder="Доп. информация..." />
            </div>

            {/* Conflict warning */}
            {conflict && (
              <div style={{ padding:12, background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'#92400E', marginBottom:8 }}>
                  ⚠️ На {time} уже есть: «{conflict.title}»
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setConflictChoice('stack'); setErr('') }} style={{
                    flex:1, padding:'8px 6px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                    background: conflictChoice==='stack' ? '#D97706' : 'white',
                    color:      conflictChoice==='stack' ? 'white'   : 'var(--text2)',
                    border:    `1.5px solid ${conflictChoice==='stack' ? '#D97706' : 'var(--border)'}`
                  }}>📌 Разместить рядом</button>
                  <button onClick={() => {
                    const free = suggestFree()
                    setConflictChoice('shift')
                    if (free) { setTime(free); setEndTime(minsToTime(timeToMins(free) + durationMins)) }
                    setConflict(null); setErr('')
                  }} style={{
                    flex:1, padding:'8px 6px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                    background: conflictChoice==='shift' ? 'var(--primary)' : 'white',
                    color:      conflictChoice==='shift' ? 'white'          : 'var(--text2)',
                    border:    `1.5px solid ${conflictChoice==='shift' ? 'var(--primary)' : 'var(--border)'}`
                  }}>🔄 Сдвинуть +15 мин</button>
                </div>
              </div>
            )}

            {err && <p style={{ fontSize:12, color:'var(--danger)' }}>{err}</p>}

            <button onClick={next}
              style={{ width:'100%', padding:12, fontSize:14, border:'none', borderRadius:10,
                background: selColor.hex, color:'white', fontWeight:700, cursor:'pointer' }}>
              Далее →
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Preview */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px',
              background: selColor.light, borderRadius:10, border:`1px solid ${selColor.hex}33` }}>
              <div style={{ width:36, height:36, borderRadius:10, background: selColor.hex,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>
                {cfg.icon}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{title}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>⏰ {time} → {endTime} · {durationLabel}</div>
              </div>
            </div>

            {/* Recurring / Custom */}
            <div style={{ display:'flex', background:'var(--surface2)', borderRadius:10, padding:3 }}>
              {[['daily','Регулярно'],['custom','Выбрать даты']].map(([k,l]) => (
                <button key={k} onClick={() => { setRecurring(k); setErr('') }} style={{
                  flex:1, padding:'8px', borderRadius:8, border:'none', fontWeight:600, fontSize:13,
                  background: recurring===k ? 'white' : 'transparent',
                  color:      recurring===k ? selColor.hex : 'var(--text3)',
                  boxShadow:  recurring===k ? 'var(--shadow)' : 'none', transition:'all .15s'
                }}>{l}</button>
              ))}
            </div>

            {recurring === 'daily' && (
              <div>
                <div className="label" style={{ marginBottom:8 }}>Повторять</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {['Ежедневно','По будням','По выходным','Раз в неделю','Раз в 2 дня'].map(f => (
                    <button key={f} onClick={() => setFreq(f)} style={{
                      padding:'7px 12px', borderRadius:20, border:'none', fontSize:12, fontWeight:600,
                      background: freq===f ? selColor.hex : 'var(--surface2)',
                      color:      freq===f ? 'white'      : 'var(--text3)', transition:'all .12s'
                    }}>{f}</button>
                  ))}
                </div>
              </div>
            )}

            {recurring === 'custom' && (
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <button onClick={() => setMonth(p => new Date(p.getFullYear(), p.getMonth()-1, 1))}
                    style={{ background:'var(--surface2)', border:'none', borderRadius:7, width:28, height:28, fontSize:15, cursor:'pointer' }}>‹</button>
                  <span style={{ fontWeight:600, fontSize:13, color:'var(--text)', textTransform:'capitalize' }}>
                    {format(month,'LLLL yyyy',{locale:ru})}
                  </span>
                  <button onClick={() => setMonth(p => new Date(p.getFullYear(), p.getMonth()+1, 1))}
                    style={{ background:'var(--surface2)', border:'none', borderRadius:7, width:28, height:28, fontSize:15, cursor:'pointer' }}>›</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
                  {DOW.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600, color:'var(--text3)', padding:'2px 0' }}>{d}</div>)}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                  {calDays.map(day => {
                    const isPast  = isBefore(day, addDays(new Date(), -1))
                    const isSel   = dates.some(d => isSameDay(d, day))
                    const isCurM  = day.getMonth() === month.getMonth()
                    const isT     = isToday(day)
                    return (
                      <button key={day.toISOString()} onClick={() => !isPast && toggleDate(day)} style={{
                        aspectRatio:'1', borderRadius:8, border:'none', fontSize:12,
                        fontWeight: isSel || isT ? 700 : 400,
                        background: isSel ? selColor.hex : isT ? selColor.light : 'transparent',
                        color: isSel ? 'white' : isT ? selColor.hex : isCurM ? 'var(--text)' : 'var(--text3)',
                        opacity: isPast ? 0.3 : 1, cursor: isPast ? 'not-allowed' : 'pointer', transition:'all .1s'
                      }}>{format(day,'d')}</button>
                    )
                  })}
                </div>
                {dates.length > 0 && (
                  <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:5 }}>
                    {[...dates].sort((a,b)=>a-b).map(d => (
                      <span key={d.toISOString()} onClick={() => toggleDate(d)}
                        style={{ padding:'3px 9px', borderRadius:20, background: selColor.light,
                          color: selColor.hex, fontSize:11, fontWeight:600, cursor:'pointer',
                          border:`1px solid ${selColor.hex}44` }}>
                        {format(d,'d MMM',{locale:ru})} ✕
                      </span>
                    ))}
                  </div>
                )}
                {err && <p style={{ fontSize:12, color:'var(--danger)', marginTop:6 }}>{err}</p>}
              </div>
            )}

            <button onClick={submit}
              style={{ width:'100%', padding:12, fontSize:14, border:'none', borderRadius:10,
                background: selColor.hex, color:'white', fontWeight:700, cursor:'pointer' }}>
              {cfg.icon} Добавить{recurring==='custom'&&dates.length>0 ? ` (${dates.length} дн.)` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
