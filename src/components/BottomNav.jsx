const TABS = [
  { id: 'today',     e: '🏠', l: 'Сегодня'   },
  { id: 'week',      e: '📅', l: 'Неделя'    },
  { id: 'analytics', e: '📊', l: 'Статистика' },
  { id: 'settings',  e: '⚙️', l: 'Настройки' },
]

export default function BottomNav({ active, onChange }) {
  return (
    <div style={{
      display: 'flex', background: 'white',
      borderTop: '1px solid #E2E8F0',
      padding: '6px 0 max(10px, env(safe-area-inset-bottom))',
      flexShrink: 0
    }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 2, background: 'none', border: 'none', padding: '4px 0'
        }}>
          <span style={{ fontSize: 22 }}>{t.e}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: active === t.id ? '#0369A1' : '#94A3B8' }}>{t.l}</span>
          {active === t.id && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#0369A1' }} />}
        </button>
      ))}
    </div>
  )
}
