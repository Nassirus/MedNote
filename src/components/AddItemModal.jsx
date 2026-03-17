import { useState } from 'react'
import { TYPE_CONFIG } from '../constants'

const EMPTY = { type: 'routine', title: '', time: '08:00', notes: '', freq: 'Ежедневно', date: '' }

export default function AddItemModal({ onAdd, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); setErr('') }

  function submit() {
    if (!form.title.trim()) { setErr('Введите название'); return }
    onAdd(form)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>Добавить в расписание</h3>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, color: 'var(--text2)' }}>✕</button>
        </div>

        {/* Type selector */}
        <label className="label">Тип</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => set('type', k)} style={{
              padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${form.type === k ? v.color : 'var(--border)'}`,
              background: form.type === k ? v.bg : 'white', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3
            }}>
              <span style={{ fontSize: 18 }}>{v.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: form.type === k ? v.color : 'var(--text3)' }}>{v.label}</span>
            </button>
          ))}
        </div>

        {/* Title */}
        <label className="label">Название *</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder={`Например: ${TYPE_CONFIG[form.type]?.label}`}
          style={{ marginBottom: err ? 4 : 14 }} />
        {err && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 10 }}>{err}</p>}

        {/* Time + Freq */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label className="label">Время</label>
            <input type="time" className="input" value={form.time} onChange={e => set('time', e.target.value)} />
          </div>
          <div>
            <label className="label">Частота</label>
            <select className="input" value={form.freq} onChange={e => set('freq', e.target.value)}>
              <option>Ежедневно</option>
              <option>Раз в неделю</option>
              <option>Раз в 2 дня</option>
              <option>По будням</option>
              <option>По выходным</option>
              <option>Разово</option>
            </select>
          </div>
        </div>

        {/* Date (optional) */}
        <label className="label">Дата (если разово)</label>
        <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} style={{ marginBottom: 14 }} />

        {/* Notes */}
        <label className="label">Примечания</label>
        <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Доп. информация, дозировка, инструкция..."
          rows={3} style={{ resize: 'none', marginBottom: 18 }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Отмена</button>
          <button className="btn btn-primary" onClick={submit} style={{ flex: 2 }}>
            {TYPE_CONFIG[form.type]?.icon} Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
