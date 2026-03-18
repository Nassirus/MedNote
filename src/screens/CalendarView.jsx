import { useState } from 'react'
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, addWeeks, subWeeks, getDay, isBefore, startOfDay
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'

const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const HOURS = Array.from({length:24},(_,i)=>i)

function getItemColor(item) {
  if (item.color) {
    const c = EVENT_COLORS.find(c => c.id === item.color)
    if (c) return c
  }
  const cfg = TYPE_CONFIG[item.type]
  return { hex: cfg?.color||'#2563EB', light: cfg?.bg||'#EFF6FF' }
}

// Robust date match — handles Firestore Timestamp, ISO string, null
function itemMatchesDay(item, d) {
  // Has specific date → show only on that date
  if (item.date) {
    try {
      let itemDate
      if (typeof item.date === 'string') {
        // 'yyyy-MM-dd' → parse as local date (not UTC) to avoid timezone shift
        const [y,mo,dd] = item.date.split('-').map(Number)
        itemDate = new Date(y, mo-1, dd)
      } else if (item.date.seconds) {
        itemDate = new Date(item.date.seconds * 1000)
      } else {
        itemDate = new Date(item.date)
      }
      return isSameDay(itemDate, d)
    } catch { return false }
  }
  // No date → recurring based on freq
  const dow = getDay(d) // 0=Sun
  switch (item.freq) {
    case 'Ежедневно':    return true
    case 'По будням':    return dow >= 1 && dow <= 5
    case 'По выходным':  return dow === 0 || dow === 6
    case 'Раз в неделю': return dow === 1
    case 'Раз в 2 дня':  return Math.floor((d - new Date('2024-01-01')) / 86400000) % 2 === 0
    case 'Разово':       return false   // no date → hide
    default:             return true
  }
}

export default function CalendarView({ items, add, toggle, remove, update }) {
  const [viewMode, setViewMode]   = useState('month')
  const [current, setCurrent]     = useState(new Date())
  const [selected, setSelected]   = useState(new Date())
  const [showAdd, setShowAdd]     = useState(false)
  const [addDefDate, setAddDefDate] = useState(null)
  const [addDefTime, setAddDefTime] = useState(null)
  const [selItem, setSelItem]     = useState(null)

  // Month grid
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn:1 }),
    end:   endOfWeek(endOfMonth(current), { weekStartsOn:1 })
  })
  // Week grid
  const weekStart = startOfWeek(current, { weekStartsOn:1 })
  const weekEnd   = endOfWeek(current, { weekStartsOn:1 })
  const weekDays  = eachDayOfInterval({ start:weekStart, end:weekEnd })

  const dayItems = (d) => items.filter(i => itemMatchesDay(i, d))
  const selItems = [...dayItems(selected)].sort((a,b) => (a.time||'').localeCompare(b.time||''))

  function navigate(dir) {
    if (viewMode==='month') setCurrent(p => dir>0 ? addMonths(p,1) : subMonths(p,1))
    else setCurrent(p => dir>0 ? addWeeks(p,1) : subWeeks(p,1))
  }
  function goToday() { setCurrent(new Date()); setSelected(new Date()) }

  function openAdd(date, time) {
    setAddDefDate(date)
    setAddDefTime(time || null)
    setShowAdd(true)
  }

  const periodLabel = viewMode==='month'
    ? format(current, 'LLLL yyyy', { locale:ru })
    : `${format(weekStart,'d MMM',{locale:ru})} — ${format(weekEnd,'d MMM yyyy',{locale:ru})}`

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding:'6px 10px' }}>‹</button>
          <h1 style={{ fontWeight:700, fontSize:17, color:'var(--text)', textTransform:'capitalize', minWidth:155 }}>
            {periodLabel}
          </h1>
          <button onClick={() => navigate(1)} className="btn btn-ghost" style={{ padding:'6px 10px' }}>›</button>
          <button onClick={goToday} className="btn btn-ghost" style={{ fontSize:12, padding:'6px 10px' }}>Сегодня</button>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', background:'var(--surface2)', borderRadius:8, padding:3 }}>
            {[['month','Месяц'],['week','Неделя']].map(([m,l]) => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding:'5px 10px', borderRadius:6, border:'none', fontSize:12, fontWeight:600,
                background: viewMode===m ? 'white' : 'transparent',
                color: viewMode===m ? 'var(--primary)' : 'var(--text3)',
                boxShadow: viewMode===m ? 'var(--shadow)' : 'none', transition:'all .12s'
              }}>{l}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => openAdd(selected)} style={{ fontSize:13, padding:'8px 14px' }}>
            + Событие
          </button>
        </div>
      </div>

      {/* ── MONTH VIEW ── */}
      {viewMode === 'month' && (
        <div className="page-content" style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
          {/* Calendar grid */}
          <div className="card" style={{ padding:16, flex:'1 1 280px', minWidth:260 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
              {DOW.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--text3)', padding:'4px 0', textTransform:'uppercase' }}>{d}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {monthDays.map(day => {
                const di    = dayItems(day)
                const isSel = isSameDay(day,selected) && !isToday(day)
                const isTod = isToday(day)
                const colors = [...new Set(di.slice(0,3).map(i => getItemColor(i).hex))]
                return (
                  <div key={day.toISOString()}
                    className={`cal-day${isTod?' today':''}${isSel?' selected':''}${!isSameMonth(day,current)?' other-month':''}`}
                    onClick={() => setSelected(day)}
                    onDoubleClick={() => openAdd(day)}>
                    <span>{format(day,'d')}</span>
                    {di.length > 0 && (
                      <div style={{ display:'flex', gap:2, marginTop:2 }}>
                        {colors.map((hex,i) => (
                          <div key={i} style={{ width:5, height:5, borderRadius:'50%',
                            background: isTod ? 'rgba(255,255,255,0.8)' : hex }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop:10, fontSize:11, color:'var(--text3)', textAlign:'center' }}>
              Дважды нажмите на дату чтобы добавить событие
            </div>
          </div>

          {/* Day detail */}
          <div style={{ flex:'1 1 240px', minWidth:220 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:12,
              textTransform:'capitalize', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>{isToday(selected)?'📍 ':''}{format(selected,'d MMMM, EEEE',{locale:ru})}</span>
              {selItems.length>0 && (
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text3)' }}>
                  {selItems.filter(i=>i.done).length}/{selItems.length} ✓
                </span>
              )}
            </div>
            {selItems.length === 0 ? (
              <div className="card" style={{ padding:'28px 16px', textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
                <div style={{ fontSize:13, color:'var(--text3)', marginBottom:14 }}>Нет событий на этот день</div>
                <button className="btn btn-primary" onClick={() => openAdd(selected)} style={{ fontSize:13, padding:'8px 18px' }}>+ Добавить</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selItems.map(item => <DayItem key={item.id} item={item} onOpen={() => setSelItem(item)} onToggle={toggle} />)}
                <button onClick={() => openAdd(selected)}
                  style={{ padding:'10px', borderRadius:10, border:'2px dashed var(--border)', background:'transparent',
                    color:'var(--text3)', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4 }}>
                  + Добавить в этот день
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {viewMode === 'week' && (
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)',
            borderBottom:'1px solid var(--border)', background:'white', flexShrink:0 }}>
            <div style={{ borderRight:'1px solid var(--border)' }}/>
            {weekDays.map(day => {
              const di = dayItems(day)
              return (
                <div key={day.toISOString()} style={{ padding:'8px 4px', textAlign:'center',
                  borderLeft:'1px solid var(--border)', cursor:'pointer',
                  background: isToday(day) ? 'var(--primary-light)' : 'transparent'
                }} onClick={() => setSelected(day)}>
                  <div style={{ fontSize:10, fontWeight:700, color: isToday(day)?'var(--primary)':'var(--text3)', textTransform:'uppercase' }}>
                    {DOW[(getDay(day)+6)%7]}
                  </div>
                  <div style={{ width:30, height:30, borderRadius:'50%', margin:'4px auto 0',
                    background: isToday(day)?'var(--primary)': isSameDay(day,selected)?'var(--primary-light)':'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:14, fontWeight: isToday(day)?700:400,
                    color: isToday(day)?'white': isSameDay(day,selected)?'var(--primary)':'var(--text)'
                  }}>
                    {format(day,'d')}
                  </div>
                  {di.length > 0 && (
                    <div style={{ fontSize:10, fontWeight:600, color: isToday(day)?'var(--primary)':'var(--text3)', marginTop:2 }}>
                      {di.length}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {HOURS.map(hour => (
              <div key={hour} style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)', minHeight:52, borderBottom:'1px solid var(--border)' }}>
                <div style={{ padding:'3px 6px 0 0', textAlign:'right', fontSize:10, color:'var(--text3)',
                  fontWeight:500, borderRight:'1px solid var(--border)', paddingTop:4 }}>
                  {hour > 0 ? `${String(hour).padStart(2,'0')}:00` : ''}
                </div>
                {weekDays.map(day => {
                  const slotItems = dayItems(day).filter(i => {
                    const [h] = (i.time||'00:00').split(':').map(Number)
                    return h === hour
                  })
                  return (
                    <div key={day.toISOString()}
                      className="time-slot"
                      style={{ background: isToday(day) ? 'rgba(37,99,235,0.03)' : 'transparent' }}
                      onClick={() => openAdd(day, `${String(hour).padStart(2,'0')}:00`)}>
                      {slotItems.map(item => {
                        const ic = getItemColor(item)
                        const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
                        return (
                          <div key={item.id}
                            className="event-pill"
                            onClick={e => { e.stopPropagation(); setSelItem(item) }}
                            style={{ background: ic.hex, color:'white',
                              textDecoration: item.done?'line-through':'none',
                              opacity: item.done?0.6:1, marginBottom:2, width:'100%' }}>
                            {cfg.icon} {item.title}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddItemModal
          defaultDate={addDefDate}
          defaultTime={addDefTime}
          existingItems={items}
          onAdd={item => { add(item); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {selItem && (
        <ItemModal item={selItem} onClose={() => setSelItem(null)} onDelete={remove} onToggle={toggle} onUpdate={update} />
      )}
    </div>
  )
}

function DayItem({ item, onOpen, onToggle }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const ic  = getItemColor(item)
  return (
    <div style={{ background:'white', borderRadius:12, padding:'10px 12px',
      display:'flex', alignItems:'center', gap:10,
      border:`1px solid ${ic.hex}33`, borderLeft:`4px solid ${ic.hex}`,
      cursor:'pointer', boxShadow:'var(--shadow)', opacity: item.done?0.55:1 }}
      onClick={onOpen}>
      <div style={{ width:36, height:36, borderRadius:10, background:ic.light,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        {cfg.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)',
          textDecoration:item.done?'line-through':'none',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>⏰ {item.time}</div>
      </div>
      <button className={`check-btn${item.done?' done':''}`}
        style={{ borderColor: item.done?'var(--success)':ic.hex, flexShrink:0 }}
        onClick={e => { e.stopPropagation(); onToggle(item.id) }}>
        {item.done && <span style={{ color:'white', fontSize:11, fontWeight:700 }}>✓</span>}
      </button>
    </div>
  )
}
