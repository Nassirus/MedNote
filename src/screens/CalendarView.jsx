import { useState } from 'react'
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, getDay
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { TYPE_CONFIG } from '../constants'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'

const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

// Returns true if item should appear on day `d`
function itemMatchesDay(item, d) {
  const dow = getDay(d) // 0=Sun,1=Mon,...,6=Sat

  // Item has a specific date — show only on that date
  if (item.date) {
    const itemDate = typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date); return isSameDay(itemDate, d)
  }

  // No specific date — use frequency
  switch (item.freq) {
    case 'Ежедневно':    return true
    case 'По будням':    return dow >= 1 && dow <= 5
    case 'По выходным':  return dow === 0 || dow === 6
    case 'Раз в неделю': return dow === 1  // Monday by default
    case 'Раз в 2 дня':  {
      // Use a fixed epoch reference
      const epoch  = new Date('2024-01-01')
      const diffMs = d - epoch
      const diffDays = Math.floor(diffMs / 86400000)
      return diffDays % 2 === 0
    }
    case 'Разово': return false  // no date = don't show
    default: return true
  }
}

export default function CalendarView({ items, add, toggle, remove, update }) {
  const [month, setMonth]     = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [selItem, setSelItem] = useState(null)

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days  = eachDayOfInterval({ start, end })

  const dayItems = (d) => items.filter(i => itemMatchesDay(i, d))
  const selItems = [...dayItems(selected)].sort((a, b) => a.time.localeCompare(b.time))

  // When adding from calendar: pass selected date as default
  // AddItemModal handles multi-date or recurring — don't override
  function handleAdd(item) {
    add(item)
    setShowAdd(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setMonth(p => subMonths(p, 1))} className="btn btn-ghost" style={{ padding: '6px 10px' }}>‹</button>
          <h1 style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', textTransform: 'capitalize', minWidth: 140 }}>
            {format(month, 'LLLL yyyy', { locale: ru })}
          </h1>
          <button onClick={() => setMonth(p => addMonths(p, 1))} className="btn btn-ghost" style={{ padding: '6px 10px' }}>›</button>
          <button onClick={() => { setMonth(new Date()); setSelected(new Date()) }}
            className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }}>Сегодня</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 13, padding: '8px 14px' }}>
          + Событие
        </button>
      </div>

      <div className="page-content" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ── Calendar grid ── */}
        <div className="card" style={{ padding: 16, flex: '1 1 280px', minWidth: 260 }}>
          <div className="cal-grid" style={{ marginBottom: 6 }}>
            {DOW.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text3)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div className="cal-grid">
            {days.map(day => {
              const di      = dayItems(day)
              const hasDots = di.length > 0
              const isSel   = isSameDay(day, selected) && !isToday(day)
              const isTod   = isToday(day)
              return (
                <div key={day.toISOString()}
                  className={`cal-day${isTod ? ' today' : ''}${isSel ? ' selected' : ''}${!isSameMonth(day, month) ? ' other-month' : ''}`}
                  onClick={() => setSelected(day)}>
                  <span>{format(day, 'd')}</span>
                  {hasDots && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      {di.slice(0, 3).map((item, i) => (
                        <div key={i} className={`cal-dot${item.done ? ' done' : ''}`}
                          style={{ background: isTod ? 'rgba(255,255,255,0.7)' : undefined }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Day detail ── */}
        <div style={{ flex: '1 1 240px', minWidth: 220 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12, textTransform: 'capitalize', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isToday(selected) ? '📍 ' : ''}{format(selected, 'd MMMM, EEEE', { locale: ru })}</span>
            {selItems.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>
                {selItems.filter(i => i.done).length}/{selItems.length} ✓
              </span>
            )}
          </div>

          {selItems.length === 0 ? (
            <div className="card" style={{ padding: '28px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Нет событий на этот день</div>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 13, padding: '8px 18px' }}>
                + Добавить
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selItems.map(item => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
                return (
                  <div key={item.id}
                    className={`schedule-item${item.done ? ' done-item' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelItem(item)}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{cfg.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>⏰ {item.time}</span>
                        {item.notes && <span style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</span>}
                      </div>
                    </div>
                    <button className={`check-btn${item.done ? ' done' : ''}`}
                      onClick={e => { e.stopPropagation(); toggle(item.id) }}>
                      {item.done && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddItemModal
          defaultDate={selected}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {selItem && (
        <ItemModal
          item={selItem}
          onClose={() => setSelItem(null)}
          onDelete={remove}
          onToggle={toggle}
          onUpdate={update}
        />
      )}
    </div>
  )
}
