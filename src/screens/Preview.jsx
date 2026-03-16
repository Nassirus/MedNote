import { TYPE_CONFIG } from '../constants.js'

export default function Preview({ items, setItems, onConfirm }) {
  const toggle = (id) => setItems(p => p.map(i => i.id === id ? { ...i, sel: !i.sel } : i))
  const count  = items.filter(i => i.sel).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
      <div style={{ padding: '14px 18px', background: 'white', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18, color: '#0F172A' }}>Найдено назначений</h2>
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Снимите галочку, если что-то лишнее</p>
      </div>

      <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.medication
          return (
            <div key={item.id} onClick={() => toggle(item.id)} style={{
              padding: '11px 13px', background: item.sel ? 'white' : '#F8FAFC',
              borderRadius: 12, border: `1.5px solid ${item.sel ? cfg.c : '#E2E8F0'}`,
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              opacity: item.sel ? 1 : 0.5, transition: 'all .15s'
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{cfg.e}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{item.time} · {item.freq}</p>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: item.sel ? cfg.c : 'transparent',
                border: `2px solid ${item.sel ? cfg.c : '#CBD5E1'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {item.sel && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '12px 16px 16px', background: 'white', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
        <button onClick={onConfirm} style={{
          width: '100%', padding: 13, background: '#0369A1', color: 'white',
          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14
        }}>Добавить {count} пункт(а) в расписание →</button>
      </div>
    </div>
  )
}
