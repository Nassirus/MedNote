import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TYPE_CONFIG } from '../constants'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'

const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function CalendarView({ items, add, toggle, remove, update }) {
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [selItem, setSelItem] = useState(null)

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days  = eachDayOfInterval({ start, end })

  const dayItems = (d) => items.filter(i => {
    if (i.date) return isSameDay(new Date(i.date), d)
    return i.freq === 'Ежедневно' || i.freq === 'По будням' || !i.date
  })

  const selItems = [...dayItems(selected)].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMonth(p => subMonths(p, 1))} className="btn btn-ghost" style={{ padding: '6px 10px' }}>‹</button>
          <h1 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', textTransform: 'capitalize', minWidth: 160 }}>
            {format(month, 'LLLL yyyy', { locale: ru })}
          </h1>
          <button onClick={() => setMonth(p => addMonths(p, 1))} className="btn btn-ghost" style={{ padding: '6px 10px' }}>›</button>
          <button onClick={() => { setMonth(new Date()); setSelected(new Date()) }} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>Сегодня</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 13, padding: '8px 14px' }}>
          + Событие
        </button>
      </div>

      <div className="page-content" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Calendar grid */}
        <div className="card" style={{ padding: 16, flex: '1 1 300px', minWidth: 280 }}>
          {/* Day of week headers */}
          <div className="cal-grid" style={{ marginBottom: 6 }}>
            {DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text3)', padding: '4px 0' }}>{d}</div>)}
          </div>
          {/* Days */}
          <div className="cal-grid">
            {days.map(day => {
              const di = dayItems(day)
              const done = di.filter(i => i.done).length
              const hasDots = di.length > 0
              return (
                <div key={day.toISOString()} className={`cal-day${isToday(day) ? ' today' : ''}${isSameDay(day, selected) && !isToday(day) ? ' selected' : ''}${!isSameMonth(day, month) ? ' other-month' : ''}`}
                  onClick={() => setSelected(day)}>
                  <span>{format(day, 'd')}</span>
                  {hasDots && <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                    {di.slice(0, 3).map((_, i) => <div key={i} className={`cal-dot${_ .done ? ' done' : ''}`} style={{ background: isToday(day) ? 'rgba(255,255,255,0.7)' : undefined }} />)}
                  </div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail */}
        <div style={{ flex: '1 1 260px', minWidth: 240 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12, textTransform: 'capitalize' }}>
            {isToday(selected) ? '📍 Сегодня — ' : ''}{format(selected, 'd MMMM, EEEE', { locale: ru })}
          </div>
          {selItems.length === 0 ? (
            <div className="card" style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 13 }}>Нет событий на этот день</div>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop: 14, fontSize: 13, padding: '8px 16px' }}>+ Добавить</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selItems.map(item => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
                return (
                  <div key={item.id} className={`schedule-item${item.done ? ' done-item' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSelItem(item)}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{cfg.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, textDecoration: item.done ? 'line-through' : 'none', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>⏰ {item.time}</div>
                    </div>
                    <button className={`check-btn${item.done ? ' done' : ''}`} onClick={e => { e.stopPropagation(); toggle(item.id) }}>
                      {item.done && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddItemModal onAdd={item => { add({ ...item, date: format(selected, 'yyyy-MM-dd') }); setShowAdd(false) }} onClose={() => setShowAdd(false)} />}
      {selItem && <ItemModal item={selItem} onClose={() => setSelItem(null)} onDelete={remove} onToggle={toggle} onUpdate={update} />}
    </div>
  )
}
