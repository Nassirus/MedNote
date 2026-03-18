import { useState, useRef, useCallback, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, addWeeks, subWeeks, getDay
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { itemMatchesDay } from '../lib/dateUtils'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'

const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const HOURS = Array.from({length:24},(_,i)=>i)
const SLOT_H = 56 // px per hour

function getItemColor(item) {
  if (item.color) {
    const c = EVENT_COLORS.find(c => c.id === item.color)
    if (c) return c
  }
  const cfg = TYPE_CONFIG[item.type]
  return { hex: cfg?.color || '#2563EB', light: cfg?.bg || '#EFF6FF' }
}

function pad(n) { return String(n).padStart(2,'0') }
function minsToTime(mins) { return `${pad(Math.floor(mins/60)%24)}:${pad(mins%60)}` }

export default function CalendarView({ items, add, toggle, remove, update }) {
  const [viewMode, setViewMode]     = useState('month')
  const [current, setCurrent]       = useState(new Date())
  const [selected, setSelected]     = useState(new Date())
  const [showAdd, setShowAdd]       = useState(false)
  const [addConfig, setAddConfig]   = useState({})   // { date, time, endTime }
  const [selItem, setSelItem]       = useState(null)

  // ── Drag-select state ──
  const [drag, setDrag] = useState(null) // { dayIdx, startMin, endMin, active }
  const gridRef  = useRef()
  const dragRef  = useRef(null) // live drag data without re-render
  const isMouseDown = useRef(false)

  // Navigation
  function navigate(dir) {
    if (viewMode==='month') setCurrent(p => dir>0 ? addMonths(p,1) : subMonths(p,1))
    else setCurrent(p => dir>0 ? addWeeks(p,1) : subWeeks(p,1))
  }
  function goToday() { setCurrent(new Date()); setSelected(new Date()) }

  // Week days
  const weekStart = startOfWeek(current, { weekStartsOn:1 })
  const weekEnd   = endOfWeek(current, { weekStartsOn:1 })
  const weekDays  = eachDayOfInterval({ start:weekStart, end:weekEnd })

  // Month grid
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn:1 }),
    end:   endOfWeek(endOfMonth(current), { weekStartsOn:1 })
  })

  const dayItems = useCallback(d => items.filter(i => itemMatchesDay(i, d)), [items])
  const selItems = [...dayItems(selected)].sort((a,b) => (a.time||'').localeCompare(b.time||''))

  // ── Drag handlers ──
  function pxToMins(clientY) {
    const grid = gridRef.current
    if (!grid) return 0
    const rect = grid.getBoundingClientRect()
    const y    = clientY - rect.top + grid.scrollTop
    const raw  = Math.round((y / SLOT_H) * 60 / 15) * 15
    return Math.max(0, Math.min(23*60+45, raw))
  }

  function getDayIdxFromX(clientX) {
    const grid = gridRef.current
    if (!grid) return 0
    const rect  = grid.getBoundingClientRect()
    const colW  = (rect.width - 52) / 7
    const x     = clientX - rect.left - 52
    return Math.max(0, Math.min(6, Math.floor(x / colW)))
  }

  function onGridMouseDown(e) {
    if (e.button !== 0) return
    e.preventDefault()
    const startMin = pxToMins(e.clientY)
    const dayIdx   = getDayIdxFromX(e.clientX)
    isMouseDown.current = true
    dragRef.current = { dayIdx, startMin, endMin: startMin + 60 }
    setDrag({ dayIdx, startMin, endMin: startMin + 60, active: true })
  }

  function onGridMouseMove(e) {
    if (!isMouseDown.current || !dragRef.current) return
    const endMin = pxToMins(e.clientY)
    const newEnd = Math.max(endMin, dragRef.current.startMin + 15)
    dragRef.current.endMin = newEnd
    setDrag(p => p ? { ...p, endMin: newEnd } : null)
  }

  function onGridMouseUp() {
    if (!isMouseDown.current || !dragRef.current) return
    isMouseDown.current = false
    const { dayIdx, startMin, endMin } = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (endMin - startMin < 15) return  // too small → ignore
    const day = weekDays[dayIdx]
    setAddConfig({
      date: day,
      time: minsToTime(startMin),
      endTime: minsToTime(endMin),
    })
    setShowAdd(true)
  }

  // Touch support
  function onGridTouchStart(e) {
    const t = e.touches[0]
    const startMin = pxToMins(t.clientY)
    const dayIdx   = getDayIdxFromX(t.clientX)
    isMouseDown.current = true
    dragRef.current = { dayIdx, startMin, endMin: startMin + 60 }
    setDrag({ dayIdx, startMin, endMin: startMin + 60, active: true })
  }
  function onGridTouchMove(e) {
    const t = e.touches[0]
    if (!isMouseDown.current || !dragRef.current) return
    const endMin = pxToMins(t.clientY)
    const newEnd = Math.max(endMin, dragRef.current.startMin + 15)
    dragRef.current.endMin = newEnd
    setDrag(p => p ? { ...p, endMin: newEnd } : null)
  }
  function onGridTouchEnd() { onGridMouseUp() }

  // Cancel drag on Escape
  useEffect(() => {
    function onKey(e) { if (e.key==='Escape') { setDrag(null); isMouseDown.current=false; dragRef.current=null } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const periodLabel = viewMode==='month'
    ? format(current,'LLLL yyyy',{locale:ru})
    : `${format(weekStart,'d MMM',{locale:ru})} — ${format(weekEnd,'d MMM yyyy',{locale:ru})}`

  // Drag overlay position
  function dragStyle() {
    if (!drag) return null
    const colW_pct = `${100/7}%`
    const top    = (drag.startMin / 60) * SLOT_H
    const height = Math.max(((drag.endMin - drag.startMin) / 60) * SLOT_H, 14)
    return { top, height, dayIdx: drag.dayIdx }
  }
  const ds = dragStyle()

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:16 }}>‹</button>
          <h1 style={{ fontWeight:700, fontSize:17, color:'var(--text)', textTransform:'capitalize', minWidth:155 }}>
            {periodLabel}
          </h1>
          <button onClick={() => navigate(1)} className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:16 }}>›</button>
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
          <button className="btn btn-primary" onClick={() => { setAddConfig({ date:selected }); setShowAdd(true) }}
            style={{ fontSize:13, padding:'8px 14px' }}>+ Событие</button>
        </div>
      </div>

      {/* ── MONTH VIEW ── */}
      {viewMode === 'month' && (
        <div className="page-content" style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div className="card" style={{ padding:16, flex:'1 1 280px', minWidth:260 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
              {DOW.map(d => (
                <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--text3)', padding:'4px 0', textTransform:'uppercase' }}>{d}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {monthDays.map(day => {
                const di    = dayItems(day)
                const isSel = isSameDay(day,selected) && !isToday(day)
                const isTod = isToday(day)
                const dotColors = [...new Map(di.slice(0,3).map(i => [i.color||i.type, getItemColor(i).hex])).values()]
                return (
                  <div key={day.toISOString()}
                    className={`cal-day${isTod?' today':''}${isSel?' selected':''}${!isSameMonth(day,current)?' other-month':''}`}
                    onClick={() => setSelected(day)}
                    onDoubleClick={() => { setAddConfig({ date:day }); setShowAdd(true) }}>
                    <span>{format(day,'d')}</span>
                    {di.length > 0 && (
                      <div style={{ display:'flex', gap:2, marginTop:2 }}>
                        {dotColors.map((hex,i) => (
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
              💡 Двойной клик по дате — добавить событие
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
                <button className="btn btn-primary" onClick={() => { setAddConfig({ date:selected }); setShowAdd(true) }}
                  style={{ fontSize:13, padding:'8px 18px' }}>+ Добавить</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selItems.map(item => (
                  <DayItem key={item.id} item={item} onOpen={() => setSelItem(item)} onToggle={toggle} />
                ))}
                <button onClick={() => { setAddConfig({ date:selected }); setShowAdd(true) }}
                  style={{ padding:'9px', borderRadius:10, border:'2px dashed var(--border)',
                    background:'transparent', color:'var(--text3)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  + Добавить в этот день
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WEEK VIEW with drag-select ── */}
      {viewMode === 'week' && (
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {/* Day header row */}
          <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)',
            borderBottom:'1px solid var(--border)', background:'white', flexShrink:0 }}>
            <div style={{ borderRight:'1px solid var(--border)' }}/>
            {weekDays.map(day => (
              <div key={day.toISOString()} style={{
                padding:'8px 4px', textAlign:'center', cursor:'pointer',
                borderLeft:'1px solid var(--border)',
                background: isToday(day) ? 'var(--primary-light)' : 'transparent'
              }} onClick={() => setSelected(day)}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                  color: isToday(day) ? 'var(--primary)' : 'var(--text3)' }}>
                  {DOW[(getDay(day)+6)%7]}
                </div>
                <div style={{ width:30, height:30, borderRadius:'50%', margin:'4px auto 0',
                  background: isToday(day) ? 'var(--primary)' : isSameDay(day,selected) ? 'var(--primary-light)' : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight: isToday(day)?700:400,
                  color: isToday(day) ? 'white' : isSameDay(day,selected) ? 'var(--primary)' : 'var(--text)'
                }}>
                  {format(day,'d')}
                </div>
                {dayItems(day).length > 0 && (
                  <div style={{ fontSize:10, fontWeight:700, color: isToday(day)?'var(--primary)':'var(--text3)', marginTop:1 }}>
                    {dayItems(day).length}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Hint */}
          <div style={{ padding:'4px 16px', background:'var(--primary-light)', borderBottom:'1px solid var(--primary-border)',
            fontSize:11, color:'var(--primary)', fontWeight:500, flexShrink:0 }}>
            💡 Зажмите и потяните вниз чтобы выбрать время — как в Google Calendar
          </div>

          {/* Time grid */}
          <div ref={gridRef}
            style={{ flex:1, overflowY:'auto', position:'relative', userSelect:'none' }}
            onMouseDown={onGridMouseDown}
            onMouseMove={onGridMouseMove}
            onMouseUp={onGridMouseUp}
            onMouseLeave={onGridMouseUp}
            onTouchStart={onGridTouchStart}
            onTouchMove={onGridTouchMove}
            onTouchEnd={onGridTouchEnd}>

            {/* Hour rows */}
            {HOURS.map(hour => (
              <div key={hour} style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)',
                height:SLOT_H, borderBottom:'1px solid var(--border)' }}>
                <div style={{ padding:'3px 6px 0 0', textAlign:'right', fontSize:10, color:'var(--text3)',
                  borderRight:'1px solid var(--border)', paddingTop:4, flexShrink:0 }}>
                  {hour > 0 ? `${pad(hour)}:00` : ''}
                </div>
                {weekDays.map((day,dayIdx) => {
                  const slotItems = dayItems(day).filter(i => {
                    const [h] = (i.time||'00:00').split(':').map(Number)
                    return h === hour
                  })
                  return (
                    <div key={dayIdx} style={{
                      borderLeft:'1px solid var(--border)', padding:'2px 3px',
                      background: isToday(day) ? 'rgba(37,99,235,0.025)' : 'transparent',
                      position:'relative', overflow:'visible'
                    }}>
                      {slotItems.map(item => {
                        const ic  = getItemColor(item)
                        const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
                        return (
                          <div key={item.id}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setSelItem(item) }}
                            style={{
                              background: ic.hex, color:'white', borderRadius:5,
                              padding:'3px 6px', marginBottom:2, fontSize:11, fontWeight:600,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                              opacity: item.done ? 0.55 : 1,
                              textDecoration: item.done ? 'line-through' : 'none',
                              cursor:'pointer', zIndex:2, position:'relative',
                              borderLeft:`3px solid ${ic.hex}CC`
                            }}>
                            {cfg.icon} {item.title}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* ── Drag selection overlay ── */}
            {drag && ds && (() => {
              const colW  = `calc((100% - 52px) / 7)`
              const left  = `calc(52px + ${ds.dayIdx} * (100% - 52px) / 7)`
              return (
                <div style={{
                  position:'absolute',
                  top: ds.top,
                  left: left,
                  width: colW,
                  height: ds.height,
                  pointerEvents:'none',
                  zIndex: 20,
                  border: '2px solid #2563EB',
                  borderRadius: 6,
                  background: 'rgba(37,99,235,0.12)',
                  backdropFilter:'blur(1px)'
                }}>
                  {/* Top handle dot */}
                  <div style={{ position:'absolute', top:-5, left:'50%', transform:'translateX(-50%)',
                    width:10, height:10, borderRadius:'50%', background:'#2563EB' }}/>
                  {/* Time label */}
                  <div style={{ position:'absolute', top:4, left:6, fontSize:11, fontWeight:700, color:'#2563EB' }}>
                    {minsToTime(drag.startMin)}
                  </div>
                  {/* Bottom handle dot + end time */}
                  <div style={{ position:'absolute', bottom:-5, right:-5,
                    width:10, height:10, borderRadius:'50%', background:'#2563EB' }}/>
                  {ds.height > 30 && (
                    <div style={{ position:'absolute', bottom:4, right:6, fontSize:11, fontWeight:700, color:'#2563EB' }}>
                      {minsToTime(drag.endMin)}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Current time line */}
            {(() => {
              const now   = new Date()
              const nowMin = now.getHours()*60 + now.getMinutes()
              const todayIdx = weekDays.findIndex(d => isToday(d))
              if (todayIdx < 0) return null
              const top = (nowMin / 60) * SLOT_H
              const left = `calc(52px + ${todayIdx} * (100% - 52px) / 7)`
              const w    = `calc((100% - 52px) / 7)`
              return (
                <div style={{ position:'absolute', top, left, width:w, pointerEvents:'none', zIndex:10, display:'flex', alignItems:'center' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#DC2626', flexShrink:0, marginLeft:-5 }}/>
                  <div style={{ flex:1, height:2, background:'#DC2626' }}/>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* AddItemModal */}
      {showAdd && (
        <AddItemModal
          defaultDate={addConfig.date}
          defaultTime={addConfig.time}
          defaultEndTime={addConfig.endTime}
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
    <div style={{ background:'white', borderRadius:12, padding:'10px 12px', display:'flex',
      alignItems:'center', gap:10, border:`1px solid ${ic.hex}33`, borderLeft:`4px solid ${ic.hex}`,
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
