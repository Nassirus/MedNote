import { TYPE_CONFIG } from '../constants.js'

export default function Report({ items, weekData, onBack }) {
  const avg = Math.round(weekData.reduce((s, d) => s + d.pct, 0) / weekData.length)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 18, color: '#0F172A' }}>Отчёт для врача</h2>
          <p style={{ fontSize: 11, color: '#64748B' }}>9–16 марта 2026</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 14, borderLeft: '4px solid #0369A1' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#0369A1', marginBottom: 4 }}>Общая сводка</p>
          <p style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
            Средний % выполнения: {avg}%. Пациент в целом соблюдает режим, критических пропусков не зафиксировано.
          </p>
        </div>

        {/* Items table */}
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 13px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Назначения и выполнение</p>
          </div>
          {items.map((item, i) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.medication
            return (
              <div key={item.id} style={{ padding: '9px 13px', borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{cfg.e}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8' }}>{item.time} · {item.freq}</p>
                </div>
                <div style={{ padding: '2px 8px', borderRadius: 20, background: item.done ? '#D1FAE5' : '#FEE2E2', fontSize: 10, fontWeight: 600, color: item.done ? '#059669' : '#DC2626', whiteSpace: 'nowrap' }}>
                  {item.done ? '✓ Выполнено' : '✗ Пропущено'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Week bars */}
        <div style={{ background: 'white', borderRadius: 12, padding: 13 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 8 }}>Соблюдение по дням</p>
          {weekData.map(d => (
            <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, width: 22, color: '#64748B' }}>{d.day}</span>
              <div style={{ flex: 1, height: 7, background: '#F1F5F9', borderRadius: 999 }}>
                <div style={{ height: 7, width: d.pct + '%', background: d.pct === 100 ? '#059669' : d.pct >= 60 ? '#0369A1' : '#F59E0B', borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', width: 32 }}>{d.pct}%</span>
            </div>
          ))}
        </div>

        <button style={{ width: '100%', padding: 13, background: '#059669', color: 'white', border: 'none', borderRadius: 11, fontWeight: 700, fontSize: 14 }}>
          📩 Отправить врачу (PDF)
        </button>
        <button style={{ width: '100%', padding: 11, background: 'white', color: '#0369A1', border: '1.5px solid #0369A1', borderRadius: 11, fontWeight: 600, fontSize: 13 }}>
          🔗 Скопировать ссылку
        </button>
      </div>
    </div>
  )
}
