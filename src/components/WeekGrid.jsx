import { useState } from 'react'
import { format, addDays, startOfWeek, isSameDay, isToday, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TYPE_CONFIG } from '../constants'

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7)  // 07:00 – 23:00

function timeToMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function itemMatchesDay(item, d) {
  if (item.date) {
    try {
      return isSameDay(typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date), d)
    } catch { return false }
  }
  const dow = d.getDay()
  switch (item.freq) {
    case 'По будням':    return dow >= 1 && dow <= 5
    case 'По выходным':  return dow === 0 || dow === 6
    case 'Разово':       return false
    default:             return true
  }
}

export default function WeekGrid({ items, weekStart, onToggle, onSelect }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const HOUR_H = 56  // px per hour

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Hour gutter */}
      <div style={{ width: 44, flexShrink: 0, borderRight: '1px solid var(--border)', paddingTop: 0 }}>
        <div style={{ height: 28 }} />
        {HOURS.map(h => (
          <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', paddingTop: 4, paddingRight: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>{String(h).padStart(2,'0')}:00</span>
          </div>
        ))}
      </div>

      {/* Days columns */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length},1fr)`, borderBottom: '1px solid var(--border)', flexShrink: 0, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
          {days.map(day => (
            <div key={day.toISOString()} style={{
              padding: '6px 4px', textAlign: 'center',
              borderLeft: '1px solid var(--border)',
              background: isToday(day) ? 'var(--primary-light)' : 'transparent'
            }}>
              <div style={{ fontSize: 10, color: isToday(day) ? 'var(--primary)' : 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>
                {format(day, 'EEE', { locale: ru })}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: isToday(day) ? 'white' : 'var(--text)',
                width: 26, height: 26, borderRadius: '50%',
                background: isToday(day) ? 'var(--primary)' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                margin: '2px auto 0'
              }}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div style={{ position: 'relative', flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length},1fr)`, position: 'relative' }}>
            {days.map(day => {
              const dayItems = items
                .filter(i => itemMatchesDay(i, day))
                .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))

              return (
                <div key={day.toISOString()} style={{ borderLeft: '1px solid var(--border)', position: 'relative', minHeight: HOUR_H * HOURS.length }}>
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div key={h} style={{ height: HOUR_H, borderTop: '1px solid var(--border)', opacity: 0.4 }} />
                  ))}

                  {/* Events */}
                  {dayItems.map(item => {
                    const cfg   = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
                    const mins  = timeToMinutes(item.time)
                    const top   = ((mins - 7 * 60) / 60) * HOUR_H
                    const height = Math.max(HOUR_H * 0.7, 32)

                    return (
                      <div key={item.id}
                        onClick={() => onSelect && onSelect(item)}
                        style={{
                          position: 'absolute',
                          top: top + 2,
                          left: 2, right: 2,
                          height: height,
                          background: item.done ? '#F1F5F9' : cfg.bg,
                          border: `1.5px solid ${item.done ? 'var(--border)' : cfg.color}44`,
                          borderLeft: `3px solid ${item.done ? 'var(--border2)' : cfg.color}`,
                          borderRadius: 6,
                          padding: '3px 5px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          zIndex: 2,
                          opacity: item.done ? 0.6 : 1,
                          transition: 'opacity .15s',
                        }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: item.done ? 'var(--text3)' : cfg.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cfg.icon} {item.title}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{item.time}</div>
                        {/* Checkbox */}
                        <div
                          onClick={e => { e.stopPropagation(); onToggle(item.id) }}
                          style={{
                            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                            width: 14, height: 14, borderRadius: '50%',
                            background: item.done ? 'var(--success)' : 'white',
                            border: `1.5px solid ${item.done ? 'var(--success)' : 'var(--border2)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                          {item.done && <span style={{ color: 'white', fontSize: 8, fontWeight: 800 }}>✓</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
