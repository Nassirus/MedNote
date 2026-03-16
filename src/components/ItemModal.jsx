import { TYPE_CONFIG } from '../constants.js'

export default function ItemModal({ item, onClose, onDelete, onToggle }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.medication

  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: '20px 18px max(20px, env(safe-area-inset-bottom))',
        width: '100%', animation: 'slideUp .2s ease'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              {cfg.e}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{item.title}</p>
              <p style={{ fontSize: 12, color: cfg.c, fontWeight: 600 }}>{cfg.l}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#F1F5F9', border: 'none', borderRadius: '50%',
            width: 32, height: 32, fontSize: 16, color: '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {[
            ['⏰ Время',     item.time],
            ['🔄 Частота',   item.freq],
            ['📝 Примечания', item.notes || '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: '#64748B', width: 100, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Status badge */}
        <div style={{
          padding: '8px 14px', borderRadius: 10, marginBottom: 14,
          background: item.done ? '#F0FDF4' : '#FFF7ED',
          border: `1px solid ${item.done ? '#BBF7D0' : '#FED7AA'}`,
          textAlign: 'center'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: item.done ? '#059669' : '#D97706' }}>
            {item.done ? '✅ Выполнено сегодня' : '⏳ Ожидает выполнения'}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onDelete(item.id)} style={{
            flex: 1, padding: 12, background: '#FEF2F2', color: '#DC2626',
            border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13
          }}>🗑 Удалить</button>
          <button onClick={() => onToggle(item.id)} style={{
            flex: 2, padding: 12,
            background: item.done ? '#F1F5F9' : '#059669',
            color: item.done ? '#64748B' : 'white',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13
          }}>{item.done ? '↩ Снять отметку' : '✓ Отметить выполненным'}</button>
        </div>
      </div>
    </div>
  )
}
