import { useState } from 'react'
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, addWeeks, subWeeks, getDay
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { TYPE_CONFIG } from '../constants'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'
import WeekGrid from '../components/WeekGrid'

const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function itemMatchesDay(item, d) {
  if (item.date) {
    try { return isSameDay(typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date), d) }
    catch { return false }
  }
  const dow = getDay(d)
  switch (item.freq) {
    case 'Ежедневно':    return true
    case 'По будням':    return dow >= 1 && dow <= 5
    case 'По выходным':  return dow === 0 || dow === 6
    case 'Раз в неделю': return dow === 1
    case 'Раз в 2 дня':  return Math.floor((d - new Date('2024-01-01')) / 86400000) % 2 === 0
    case 'Разово':       return false
    default:             return true
  }
}

export default function CalendarView({ items, add, toggle, remove, update }) {
  const [viewMode, setViewMode] = useState('month')
  const [month, setMonth]       = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selected, setSelected] = useState(new Date())
  const [showAdd, setShowAdd]   = useState(false)
  const [selItem, setSelItem]   = useState(null)

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days  = eachDayOfInterval({ start, end })

  const dayItems = (d) => items.filter(i => itemMatchesDay(i, d))
  const selItems = [...dayItems(selected)].sort((a,b) => (a.time||'').localeCompare(b.time||''))

  function goBack()    { viewMode === 'month' ? setMonth(p => subMonths(p,1)) : setWeekStart(p => subWeeks(p,1)) }
  function goForward() { viewMode === 'month' ? setMonth(p => addMonths(p,1)) : setWeekStart(p => addWeeks(p,1)) }
  function goToday()   { const n = new Date(); setMonth(n); setSelected(n); setWeekStart(startOfWeek(n,{weekStartsOn:1})) }

  const headerTitle = viewMode === 'month'
    ? format(month, 'LLLL yyyy', { locale: ru })
    : `${format(weekStart,'d MMM',{locale:ru})} — ${format(addWeeks(weekStart,1),'d MMM yyyy',{locale:ru})}`

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={goBack} className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:16 }}>‹</button>
          <h1 style={{ fontWeight:700, fontSize:16, color:'var(--text)', textTransform:'capitalize', minWidth:150 }}>
            {headerTitle}
          </h1>
          <button onClick={goForward} className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:16 }}>›</button>
          <button onClick={goToday} className="btn btn-ghost" style={{ fontSize:12, padding:'6px 10px' }}>Сегодня</button>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <div style={{ display:'flex', background:'var(--surface2)', borderRadius:8, padding:2 }}>
            {[['month','📅 Месяц'],['week','⏱ Неделя']].map(([m,l]) => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding:'5px 10px', borderRadius:6, border:'none', fontSize:12, fontWeight:600,
                background: viewMode===m ? 'white' : 'transparent',
                color: viewMode===m ? 'var(--primary)' : 'var(--text3)',
                boxShadow: viewMode===m ? 'var(--shadow)' : 'none', transition:'all .12s'
              }}>{l}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize:13, padding:'7px 13px' }}>
            + Событие
          </button>
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="page-content" style={{ display:'flex', gap:18, alignItems:'flex-start', flexWrap:'wrap' }}>
          {/* Grid */}
          <div className="card" style={{ padding:14, flex:'1 1 280px', minWidth:260 }}>
            <div className="cal-grid" style={{ marginBottom:6 }}>
              {DOW.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600, color:'var(--text3)', padding:'3px 0' }}>{d}</div>)}
            </div>
            <div className="cal-grid">
              {days.map(day => {
                const di    = dayItems(day)
                const isSel = isSameDay(day,selected) && !isToday(day)
                const isTod = isToday(day)
                return (
                  <div key={day.toISOString()}
                    className={`cal-day${isTod?' today':''}${isSel?' selected':''}${!isSameMonth(day,month)?' other-month':''}`}
                    onClick={() => setSelected(day)}>
                    <span>{format(day,'d')}</span>
                    {di.length > 0 && (
                      <div style={{ display:'flex', gap:2, marginTop:2 }}>
                        {di.slice(0,3).map((item,i) => (
                          <div key={i} style={{ width:4, height:4, borderRadius:'50%', background: isTod ? 'rgba(255,255,255,0.75)' : (TYPE_CONFIG[item.type]?.color || '#2563EB') }} />
                        ))}
                        {di.length>3 && <span style={{ fontSize:8, color:isTod?'rgba(255,255,255,0.7)':'var(--text3)' }}>+{di.length-3}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day panel */}
          <div style={{ flex:'1 1 240px', minWidth:220 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', textTransform:'capitalize' }}>
                {isToday(selected)?'📍 ':''}{format(selected,'d MMMM, EEEE',{locale:ru})}
              </div>
              {selItems.length>0 && <span style={{ fontSize:12, fontWeight:600, color:'var(--text3)' }}>{selItems.filter(i=>i.done).length}/{selItems.length} ✓</span>}
            </div>

            {selItems.length === 0 ? (
              <div className="card" style={{ padding:'28px 16px', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                <div style={{ fontSize:13, color:'var(--text3)', marginBottom:14 }}>Нет событий на этот день</div>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize:13, padding:'8px 18px' }}>+ Добавить</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selItems.map(item => {
                  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
                  return (
                    <div key={item.id} className={`schedule-item${item.done?' done-item':''}`} style={{ cursor:'pointer' }} onClick={() => setSelItem(item)}>
                      <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>{cfg.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', textDecoration:item.done?'line-through':'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
                        <div style={{ display:'flex', gap:6, marginTop:2 }}>
                          <span style={{ fontSize:11, color:'var(--text3)' }}>⏰ {item.time}</span>
                          {item.notes && <span style={{ fontSize:11, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.notes}</span>}
                        </div>
                      </div>
                      <button className={`check-btn${item.done?' done':''}`} onClick={e=>{ e.stopPropagation(); toggle(item.id) }}>
                        {item.done && <span style={{ color:'white', fontSize:11, fontWeight:700 }}>✓</span>}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:'0 4px' }}>
          <WeekGrid items={items} weekStart={weekStart} onToggle={toggle} onSelect={setSelItem} />
        </div>
      )}

      {showAdd && (
        <AddItemModal
          defaultDate={viewMode==='month' ? selected : null}
          onAdd={item => { add(item); setShowAdd(false) }} existingItems={items}
          onClose={() => setShowAdd(false)}
        />
      )}
      {selItem && <ItemModal item={selItem} onClose={() => setSelItem(null)} onDelete={remove} onToggle={toggle} onUpdate={update} />}
    </div>
  )
}
