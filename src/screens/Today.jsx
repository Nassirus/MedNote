import { TYPE_CONFIG } from '../constants.js'

export default function Today({ items, toggle, pct, done, onSelect, showAdd, setShowAdd, newItem, setNewItem, onAdd }) {
  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px 0', background: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 12, color: '#64748B' }}>Понедельник, 16 марта</p>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A' }}>Расписание дня</h2>
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            width: 36, height: 36, borderRadius: '50%', background: '#0369A1',
            border: 'none', color: 'white', fontSize: 24, display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1
          }}>+</button>
        </div>
        {/* Progress */}
        <div style={{ marginTop: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Выполнено {done} из {items.length}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#059669' : '#0369A1' }}>{pct}%</span>
          </div>
          <div style={{ height: 7, background: '#E2E8F0', borderRadius: 999 }}>
            <div style={{ height: 7, width: pct + '%', background: pct === 100 ? '#059669' : '#0369A1', borderRadius: 999, transition: 'width .4s ease' }} />
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: '10px 14px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(item => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.medication
          return (
            <div key={item.id} style={{
              background: 'white', borderRadius: 13, padding: '11px 13px',
              display: 'flex', alignItems: 'center', gap: 11,
              border: '1px solid #F1F5F9', opacity: item.done ? 0.55 : 1, transition: 'opacity .2s'
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{cfg.e}</div>
              <div style={{ flex: 1, minWidth: 0 }} onClick={() => onSelect(item)}>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: '#64748B' }}>⏰ {item.time}</span>
                  {item.notes && <span style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</span>}
                </div>
              </div>
              <button onClick={() => toggle(item.id)} style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                border: `2.5px solid ${item.done ? '#059669' : '#CBD5E1'}`,
                background: item.done ? '#059669' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s', boxShadow: item.done ? '0 0 0 3px #D1FAE5' : 'none'
              }}>
                {item.done && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
              </button>
            </div>
          )
        })}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: '18px 18px 0 0', padding: 18, width: '100%' }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: '#0F172A' }}>Добавить пункт</h3>
            <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}
              style={{ width: '100%', padding: '9px 11px', border: '1.5px solid #E2E8F0', borderRadius: 9, marginBottom: 8, fontSize: 13, background: 'white', color: '#0F172A' }}>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.e} {v.l}</option>)}
            </select>
            <input value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} placeholder="Название"
              style={{ width: '100%', padding: '9px 11px', border: '1.5px solid #E2E8F0', borderRadius: 9, marginBottom: 8, fontSize: 13, color: '#0F172A' }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="time" value={newItem.time} onChange={e => setNewItem({ ...newItem, time: e.target.value })}
                style={{ flex: 1, padding: '9px 11px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, color: '#0F172A' }} />
              <input value={newItem.freq} onChange={e => setNewItem({ ...newItem, freq: e.target.value })} placeholder="Частота"
                style={{ flex: 1, padding: '9px 11px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, color: '#0F172A' }} />
            </div>
            <input value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} placeholder="Примечания"
              style={{ width: '100%', padding: '9px 11px', border: '1.5px solid #E2E8F0', borderRadius: 9, marginBottom: 14, fontSize: 13, color: '#0F172A' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 11, background: '#F1F5F9', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, color: '#64748B' }}>Отмена</button>
              <button onClick={onAdd} style={{ flex: 2, padding: 11, background: '#0369A1', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13 }}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
