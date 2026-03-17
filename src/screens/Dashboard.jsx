import { useState } from 'react'
import { TYPE_CONFIG } from '../constants'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function Dashboard({ items, toggle, add, remove, update, dbError }) {
  const { profile } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  const today   = new Date()
  const dateStr = format(today, 'd MMMM yyyy, EEEE', { locale: ru })
  const name    = profile?.name?.split(' ')[0] || 'друг'

  // Only show today's items: date=null (recurring) OR date = today
  const todayStr = format(today, 'yyyy-MM-dd')
  const todayItems = items.filter(i => {
    if (!i.date) return true                // recurring - show every day
    return i.date === todayStr              // specific date - only today
  })
  const sorted   = [...todayItems].sort((a, b) => (a.time||'').localeCompare(b.time||''))
  const filtered = filter === 'all'    ? sorted
                 : filter === 'done'   ? sorted.filter(i => i.done)
                 :                       sorted.filter(i => !i.done)

  const done  = todayItems.filter(i => i.done).length
  const total = todayItems.length
  const pct   = total ? Math.round(done / total * 100) : 0

  const byType = Object.entries(
    todayItems.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc }, {})
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'capitalize' }}>{dateStr}</div>
          <h1 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>Привет, {name} 👋</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ gap: 6, padding: '8px 14px', fontSize: 13 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Добавить
        </button>
      </div>

      <div className="page-content">

        {/* Firestore index warning */}
        {dbError === 'index' && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
            ⚠️ <strong>Нужен индекс Firestore.</strong> Зайди в Firebase Console → Firestore Database → Indexes → Add composite index:<br/>
            Collection: <code>schedule_items</code> | Fields: <code>user_id ASC</code>, <code>time ASC</code>
          </div>
        )}

        {/* Progress card */}
        <div className="card" style={{ padding: '18px 20px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Выполнение сегодня</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: pct === 100 ? 'var(--success)' : 'var(--primary)', lineHeight: 1.2 }}>{pct}%</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{done} из {total} пунктов</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {byType.slice(0, 3).map(([type]) => {
                const cfg = TYPE_CONFIG[type]
                if (!cfg) return null
                return (
                  <div key={type} style={{ width: 34, height: 34, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
                    {cfg.icon}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: 8, width: pct + '%',
              background: pct === 100 ? 'var(--success)' : 'linear-gradient(90deg,var(--primary),#0D9488)',
              borderRadius: 999, transition: 'width .5s ease'
            }} />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[
            ['all',     `Все (${total})`],
            ['pending', `Ожидает (${total - done})`],
            ['done',    `Готово (${done})`],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600,
              background: filter === k ? 'var(--primary)' : 'var(--surface)',
              color: filter === k ? 'white' : 'var(--text3)',
              boxShadow: filter === k ? 'none' : 'var(--shadow)', transition: 'all .15s'
            }}>{l}</button>
          ))}
        </div>

        {/* Schedule list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>
                {filter === 'done' ? '🎉' : total === 0 ? '📋' : '✅'}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                {filter === 'done' && done === 0 ? 'Ещё ничего не выполнено'
                 : total === 0 ? 'Расписание пустое'
                 : 'Всё выполнено!'}
              </div>
              {total === 0 && (
                <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop: 10 }}>
                  + Добавить задачу
                </button>
              )}
            </div>
          )}

          {filtered.map(item => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
            return (
              <div key={item.id} className={`schedule-item${item.done ? ' done-item' : ''}`}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelected(item)}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>⏰ {item.time}</span>
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 10 }}>{cfg.label}</span>
                    {item.notes && <span style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</span>}
                  </div>
                </div>
                <button className={`check-btn${item.done ? ' done' : ''}`} onClick={() => toggle(item.id)}>
                  {item.done && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {showAdd && <AddItemModal onAdd={add} onClose={() => setShowAdd(false)} />}
      {selected && (
        <ItemModal
          item={selected}
          onClose={() => setSelected(null)}
          onDelete={remove}
          onToggle={toggle}
          onUpdate={update}
        />
      )}
    </div>
  )
}
