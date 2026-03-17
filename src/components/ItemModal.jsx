import { useState } from 'react'
import { TYPE_CONFIG } from '../constants'

export default function ItemModal({ item, onClose, onDelete, onToggle, onUpdate }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: item.title, time: item.time, notes: item.notes || '', freq: item.freq })

  function save() {
    onUpdate(item.id, form)
    setEditing(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{cfg.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{item.title}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: cfg.color, marginTop: 1 }}>{cfg.label}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditing(!editing)} style={{ background: 'var(--surface2)', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
              {editing ? 'Отмена' : '✏️ Изменить'}
            </button>
            <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 15, color: 'var(--text2)' }}>✕</button>
          </div>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Название</label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label">Время</label>
                <input type="time" className="input" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
              </div>
              <div>
                <label className="label">Частота</label>
                <select className="input" value={form.freq} onChange={e => setForm(p => ({ ...p, freq: e.target.value }))}>
                  <option>Ежедневно</option><option>Раз в неделю</option><option>По будням</option><option>Разово</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Примечания</label>
              <textarea className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ resize: 'none' }} />
            </div>
            <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}>Сохранить</button>
          </div>
        ) : (
          <>
            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[['⏰ Время', item.time], ['🔄 Частота', item.freq], ['📝 Примечания', item.notes || '—']].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 9 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', width: 100, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>
            {/* Status */}
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: item.done ? 'var(--success-light)' : 'var(--warning-light)', border: `1px solid ${item.done ? '#A7F3D0' : '#FDE68A'}`, textAlign: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: item.done ? 'var(--success)' : 'var(--warning)' }}>
                {item.done ? '✅ Выполнено сегодня' : '⏳ Ожидает выполнения'}
              </span>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger" onClick={() => { onDelete(item.id); onClose() }} style={{ flex: 1 }}>🗑 Удалить</button>
              <button className="btn" onClick={() => { onToggle(item.id); onClose() }} style={{ flex: 2, background: item.done ? 'var(--surface2)' : 'var(--success)', color: item.done ? 'var(--text2)' : 'white' }}>
                {item.done ? '↩ Снять отметку' : '✓ Выполнено'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
