import { useState, useRef, useCallback, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, addWeeks, subWeeks, getDay
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { itemMatchesDay, isDoneToday, canToggleItem, timeToMins, minsToTime, itemDuration, layoutItems } from '../lib/dateUtils'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'

const DOW          = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const HOURS        = Array.from({length:24}, (_,i) => i)
const SLOT_H       = 60        // px per hour
const LABEL_W      = 52        // px for time labels column

function getItemColor(item) {
  if (item.color) {
    const c = EVENT_COLORS.find(c => c.id === item.color)
    if (c) return c
  }
  const cfg = TYPE_CONFIG[item.type]
  return { hex: cfg?.color || '#2563EB', light: cfg?.bg || '#EFF6FF' }
}

// ── Week grid item block ─────────────────────────────────────────────
function WeekEventBlock({ layoutEv, onOpen }) {
  const { item, start, end, colIdx, colCount } = layoutEv
  const ic  = getItemColor(item)
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine

  const top    = (start / 60) * SLOT_H
  const height = Math.max(((end - start) / 60) * SLOT_H, 20) // min 20px
  const width  = `calc((100% - 2px) / ${colCount})`
  const left   = `calc(${colIdx} * (100% - 2px) / ${colCount})`

  const done   = isDoneToday(item)
  const dur    = end - start
  const durLabel = dur >= 60 ? `${Math.floor(dur/60)}ч ${dur%60?dur%60+'м':''}` : `${dur}м`

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onOpen(item) }}
      style={{
        position: 'absolute',
        top, height,
        left, width,
        background: ic.hex,
        borderRadius: 5,
        padding: '3px 5px',
        cursor: 'pointer',
        overflow: 'hidden',
        opacity: done ? 0.5 : 1,
        boxSizing: 'border-box',
        borderLeft: `3px solid ${ic.hex}BB`,
        zIndex: 3,
        transition: 'opacity .15s',
      }}>
      <div style={{ fontSize:11, fontWeight:700, color:'white', lineHeight:1.2,
        textDecoration: done ? 'line-through' : 'none',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {cfg.icon} {item.title}
      </div>
      {height > 30 && (
        <div style={{ fontSize:9, color:'rgba(255,255,255,0.8)', marginTop:1 }}>
          {item.time} — {item.endTime || minsToTime(end)} · {durLabel}
        </div>
      )}
    </div>
  )
}

export default function CalendarView({ items, add, toggle, remove, update }) {
  const [viewMode, setViewMode]   = useState('month')
  const [current, setCurrent]     = useState(new Date())
  const [selected, setSelected]   = useState(new Date())
  const [showAdd, setShowAdd]     = useState(false)
  const [addConfig, setAddConfig] = useState({})
  const [selItem, setSelItem]     = useState(null)

  // Drag-select state
  const [drag, setDrag]       = useState(null)
  const gridRef               = useRef()
  const dragRef               = useRef(null)
  const isDown                = useRef(false)

  // Navigation
  function navigate(dir) {
    if (viewMode==='month') setCurrent(p => dir>0 ? addMonths(p,1) : subMonths(p,1))
    else setCurrent(p => dir>0 ? addWeeks(p,1) : subWeeks(p,1))
  }
  function goToday() { setCurrent(new Date()); setSelected(new Date()) }

  // Grids
  const weekStart = startOfWeek(current, { weekStartsOn:1 })
  const weekEnd   = endOfWeek(current,   { weekStartsOn:1 })
  const weekDays  = eachDayOfInterval({ start:weekStart, end:weekEnd })
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn:1 }),
    end:   endOfWeek(endOfMonth(current),     { weekStartsOn:1 })
  })

  const dayItems  = useCallback(d => items.filter(i => itemMatchesDay(i, d)), [items])
  const selItems  = [...dayItems(selected)].sort((a,b) => (a.time||'').localeCompare(b.time||''))

  // ── Drag helpers ──
  function pxToMins(clientY) {
    const grid = gridRef.current
    if (!grid) return 0
    const rect = grid.getBoundingClientRect()
    const y    = clientY - rect.top + grid.scrollTop
    return Math.round((y / SLOT_H) * 60 / 15) * 15
  }
  function pxToDayIdx(clientX) {
    const grid = gridRef.current
    if (!grid) return 0
    const rect = grid.getBoundingClientRect()
    const colW = (rect.width - LABEL_W) / 7
    return Math.max(0, Math.min(6, Math.floor((clientX - rect.left - LABEL_W) / colW)))
  }

  function startDrag(clientX, clientY) {
    const startMin = Math.max(0, Math.min(23*60, pxToMins(clientY)))
    const dayIdx   = pxToDayIdx(clientX)
    isDown.current   = true
    dragRef.current  = { dayIdx, startMin, endMin: startMin + 60 }
    setDrag({ dayIdx, startMin, endMin: startMin + 60 })
  }
  function moveDrag(clientX, clientY) {
    if (!isDown.current || !dragRef.current) return
    const endMin = Math.max(dragRef.current.startMin + 15, pxToMins(clientY))
    dragRef.current.endMin = endMin
    setDrag(p => p ? { ...p, endMin } : null)
  }
  function endDrag() {
    if (!isDown.current || !dragRef.current) return
    isDown.current = false
    const { dayIdx, startMin, endMin } = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (endMin - startMin < 15) return
    setAddConfig({ date: weekDays[dayIdx], time: minsToTime(startMin), endTime: minsToTime(endMin) })
    setShowAdd(true)
  }

  useEffect(() => {
    const onKey = e => { if (e.key==='Escape') { setDrag(null); isDown.current=false; dragRef.current=null } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const periodLabel = viewMode==='month'
    ? format(current,'LLLL yyyy',{locale:ru})
    : `${format(weekStart,'d MMM',{locale:ru})} — ${format(weekEnd,'d MMM yyyy',{locale:ru})}`

  // Drag overlay geometry
  const dragOverlay = drag ? {
    top:    (Math.min(drag.startMin, drag.endMin) / 60) * SLOT_H,
    height: (Math.abs(drag.endMin - drag.startMin) / 60) * SLOT_H,
    dayIdx: drag.dayIdx,
  } : null

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0, flex:1 }}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:16, flexShrink:0 }}>‹</button>
          <h1 style={{ fontWeight:700, fontSize:15, color:'var(--text)', textTransform:'capitalize', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1, textAlign:'center' }}>
            {periodLabel}
          </h1>
          <button onClick={() => navigate(1)} className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:16, flexShrink:0 }}>›</button>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button onClick={goToday} className="btn btn-ghost" style={{ fontSize:12, padding:'6px 8px' }}>●</button>
          <div style={{ display:'flex', background:'var(--surface2)', borderRadius:8, padding:3 }}>
            {[['month','М'],['week','Н']].map(([m,l]) => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding:'5px 9px', borderRadius:6, border:'none', fontSize:12, fontWeight:600,
                background: viewMode===m ? 'white' : 'transparent',
                color: viewMode===m ? 'var(--primary)' : 'var(--text3)',
                boxShadow: viewMode===m ? 'var(--shadow)' : 'none', transition:'all .12s'
              }}>{l}</button>
            ))}
          </div>
          <button className="btn btn-primary"
            onClick={() => { setAddConfig({ date:selected }); setShowAdd(true) }}
            style={{ fontSize:13, padding:'7px 12px' }}>+</button>
        </div>
      </div>

      {/* ── MONTH VIEW ── */}
      {viewMode === 'month' && (
        <div className="page-content" style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div className="card" style={{ padding:16, flex:'1 1 280px', minWidth:260 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
              {DOW.map(d => (
                <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--text3)',
                  padding:'4px 0', textTransform:'uppercase' }}>{d}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {monthDays.map(day => {
                const di      = dayItems(day)
                const isTod   = isToday(day)
                const isSel   = isSameDay(day, selected) && !isTod
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
              💡 Двойной клик — добавить событие
            </div>
          </div>

          {/* Day detail */}
          <div style={{ flex:'1 1 240px', minWidth:220 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:12,
              textTransform:'capitalize', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>{isToday(selected)?'📍 ':''}{format(selected,'d MMMM, EEEE',{locale:ru})}</span>
              {selItems.length>0 && (
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text3)' }}>
                  {selItems.filter(i=>isDoneToday(i)).length}/{selItems.length} ✓
                </span>
              )}
            </div>
            {selItems.length === 0 ? (
              <div className="card" style={{ padding:'28px 16px', textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
                <div style={{ fontSize:13, color:'var(--text3)', marginBottom:14 }}>Нет событий</div>
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

      {/* ── WEEK VIEW ── */}
      {viewMode === 'week' && (
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {/* Horizontal scroll wrapper for narrow screens */}
          <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', display:'flex', flexDirection:'column', WebkitOverflowScrolling:'touch' }}>
          <div style={{ minWidth:520, flex:1, display:'flex', flexDirection:'column' }}>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:`${LABEL_W}px repeat(7,1fr)`,
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
                  fontSize:14, fontWeight: isToday(day) ? 700 : 400,
                  color: isToday(day) ? 'white' : isSameDay(day,selected) ? 'var(--primary)' : 'var(--text)'
                }}>{format(day,'d')}</div>
                {dayItems(day).length > 0 && (
                  <div style={{ fontSize:9, fontWeight:700, color: isToday(day)?'var(--primary)':'var(--text3)', marginTop:1 }}>
                    {dayItems(day).length}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Hint */}
          <div style={{ padding:'4px 14px', background:'var(--primary-light)',
            borderBottom:'1px solid var(--primary-border)', fontSize:11, color:'var(--primary)',
            fontWeight:500, flexShrink:0 }}>
            💡 Зажмите и потяните чтобы выбрать время — как в Google Calendar
          </div>

          {/* Time grid */}
          <div
            ref={gridRef}
            style={{ flex:1, overflowY:'auto', position:'relative', userSelect:'none', background:'white' }}
            onMouseDown={e => startDrag(e.clientX, e.clientY)}
            onMouseMove={e => moveDrag(e.clientX, e.clientY)}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchStart={e => { const t=e.touches[0]; startDrag(t.clientX, t.clientY) }}
            onTouchMove={e => { const t=e.touches[0]; moveDrag(t.clientX, t.clientY) }}
            onTouchEnd={endDrag}>

            {/* ── Background hour lines ── */}
            <div style={{ position:'absolute', inset:0, display:'grid',
              gridTemplateColumns:`${LABEL_W}px repeat(7,1fr)`,
              pointerEvents:'none' }}>
              {HOURS.map(hour => (
                <div key={hour} style={{ contents:'', display:'contents' }}>
                  <div style={{ gridColumn:1, height:SLOT_H,
                    borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)',
                    padding:'3px 6px 0 0', textAlign:'right', fontSize:10,
                    color:'var(--text3)', fontWeight:500 }}>
                    {hour > 0 ? `${String(hour).padStart(2,'0')}:00` : ''}
                  </div>
                  {weekDays.map((day,di) => (
                    <div key={di} style={{ height:SLOT_H,
                      borderBottom:'1px solid var(--border)',
                      borderLeft: di===0 ? '1px solid var(--border)' : '1px solid var(--border)',
                      background: isToday(day) ? 'rgba(37,99,235,0.02)' : 'transparent',
                      boxSizing:'border-box' }} />
                  ))}
                </div>
              ))}
            </div>

            {/* ── Event blocks (absolutely positioned) ── */}
            {weekDays.map((day, dayIdx) => {
              const di       = dayItems(day)
              const layouts  = layoutItems(di)
              const colLeft  = `calc(${LABEL_W}px + ${dayIdx} * (100% - ${LABEL_W}px) / 7)`
              const colWidth = `calc((100% - ${LABEL_W}px) / 7)`
              if (!layouts.length) return null
              return (
                <div key={day.toISOString()} style={{
                  position:'absolute', top:0,
                  left: colLeft, width: colWidth,
                  height: 24 * SLOT_H,
                  pointerEvents:'none'
                }}>
                  {layouts.map((lev, i) => (
                    <div key={i} style={{ pointerEvents:'all', position:'absolute',
                      top:0, left:0, width:'100%', height:'100%' }}>
                      <WeekEventBlock layoutEv={lev} onOpen={it => setSelItem(it)} />
                    </div>
                  ))}
                </div>
              )
            })}

            {/* ── Drag selection overlay ── */}
            {dragOverlay && (() => {
              const colLeft  = `calc(${LABEL_W}px + ${dragOverlay.dayIdx} * (100% - ${LABEL_W}px) / 7)`
              const colWidth = `calc((100% - ${LABEL_W}px) / 7)`
              return (
                <div style={{
                  position:'absolute',
                  top: dragOverlay.top, height: dragOverlay.height,
                  left: colLeft, width: colWidth,
                  pointerEvents:'none', zIndex:20,
                  border:'2px solid #2563EB', borderRadius:6,
                  background:'rgba(37,99,235,0.12)'
                }}>
                  <div style={{ position:'absolute', top:-5, left:'50%', transform:'translateX(-50%)',
                    width:10, height:10, borderRadius:'50%', background:'#2563EB' }}/>
                  <div style={{ position:'absolute', top:4, left:6, fontSize:11, fontWeight:700, color:'#2563EB' }}>
                    {minsToTime(drag.startMin)}
                  </div>
                  {dragOverlay.height > 28 && (
                    <>
                      <div style={{ position:'absolute', bottom:-5, right:-5,
                        width:10, height:10, borderRadius:'50%', background:'#2563EB' }}/>
                      <div style={{ position:'absolute', bottom:4, right:6, fontSize:11, fontWeight:700, color:'#2563EB' }}>
                        {minsToTime(drag.endMin)}
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            {/* ── Current time indicator ── */}
            {(() => {
              const now      = new Date()
              const nowMins  = now.getHours()*60 + now.getMinutes()
              const todayIdx = weekDays.findIndex(d => isToday(d))
              if (todayIdx < 0) return null
              const top     = (nowMins / 60) * SLOT_H
              const colLeft = `calc(${LABEL_W}px + ${todayIdx} * (100% - ${LABEL_W}px) / 7)`
              const colW    = `calc((100% - ${LABEL_W}px) / 7)`
              return (
                <div style={{ position:'absolute', top, left:colLeft, width:colW,
                  pointerEvents:'none', zIndex:10, display:'flex', alignItems:'center' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#DC2626',
                    flexShrink:0, marginLeft:-5 }}/>
                  <div style={{ flex:1, height:2, background:'#DC2626' }}/>
                </div>
              )
            })()}

            {/* Spacer to ensure full 24-hour height */}
            <div style={{ height: 24 * SLOT_H, width:'100%' }} />
          </div>
          </div>
          </div>
        </div>
      )}

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
        <ItemModal item={selItem} onClose={() => setSelItem(null)}
          onDelete={remove} onToggle={toggle} onUpdate={update} />
      )}
    </div>
  )
}

function DayItem({ item, onOpen, onToggle }) {
  const cfg  = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const ic   = getItemColor(item)
  const done = isDoneToday(item)
  return (
    <div style={{ background:'white', borderRadius:12, padding:'10px 12px', display:'flex',
      alignItems:'center', gap:10, border:`1px solid ${ic.hex}33`, borderLeft:`4px solid ${ic.hex}`,
      cursor:'pointer', boxShadow:'var(--shadow)', opacity: done ? 0.55 : 1 }}
      onClick={onOpen}>
      <div style={{ width:36, height:36, borderRadius:10, background:ic.light,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        {cfg.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {item.title}
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
          ⏰ {item.time}{item.endTime ? ` — ${item.endTime}` : ''}
        </div>
      </div>
      {canToggleItem(item) ? (
        <button className={`check-btn${done?' done':''}`}
          style={{ borderColor: done ? 'var(--success)' : ic.hex, flexShrink:0 }}
          onClick={e => { e.stopPropagation(); onToggle(item.id) }}>
          {done && <span style={{ color:'white', fontSize:11, fontWeight:700 }}>✓</span>}
        </button>
      ) : (
        <div title="День ещё не наступил" style={{
          width:24, height:24, borderRadius:'50%', flexShrink:0,
          border:'2px solid #CBD5E1', background:'#F8FAFC',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:12
        }}>🔒</div>
      )}
    </div>
  )
}
