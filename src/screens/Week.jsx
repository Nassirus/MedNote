import { TYPE_CONFIG } from '../constants.js'

export default function Week({ items, weekData }) {
  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 0', background: 'white', flexShrink: 0 }}>
        <p style={{ fontSize: 12, color: '#64748B' }}>11 — 17 марта 2026</p>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 12 }}>Неделя</h2>
        {/* Week heat map */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {weekData.map((d, i) => (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: i === 0 ? '#0369A1' : '#94A3B8' }}>{d.day}</span>
              <div style={{
                width: '100%', height: 36, borderRadius: 8,
                background: i === 0 ? '#0369A1' : d.pct === 100 ? '#D1FAE5' : d.pct >= 60 ? '#DBEAFE' : '#FEE2E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? 'white' : d.pct === 100 ? '#059669' : d.pct >= 60 ? '#1D4ED8' : '#DC2626' }}>
                  {i === 0 ? '★' : d.pct + '%'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '10px 14px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#0369A1', marginBottom: 4 }}>Сегодня — 16 марта</p>
        {sorted.map(item => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.medication
          return (
            <div key={item.id} style={{ background: 'white', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 9, border: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 18 }}>{cfg.e}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                <p style={{ fontSize: 11, color: '#64748B' }}>{item.time} · {item.freq}</p>
              </div>
              <span style={{ fontSize: 17 }}>{item.done ? '✅' : '⬜'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
