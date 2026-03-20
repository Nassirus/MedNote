import { useState } from 'react'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { canToggleItem, isDoneToday, minsToTime, timeToMins } from '../lib/dateUtils'

export default function ItemModal({ item, onClose, onDelete, onToggle, onUpdate }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const ic  = EVENT_COLORS.find(c => c.id === item.color) || { hex: cfg.color, light: cfg.bg }

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title:   item.title   || '',
    time:    item.time    || '08:00',
    endTime: item.endTime || minsToTime(timeToMins(item.time || '08:00') + 30),
    notes:   item.notes   || '',
    freq:    item.freq    || 'Ежедневно',
    color:   item.color   || 'blue',
  })

  const durationMins = Math.max(0, timeToMins(form.endTime) - timeToMins(form.time))
  const durLabel = durationMins >= 60
    ? `${Math.floor(durationMins/60)} ч${durationMins%60 ? ' ' + durationMins%60 + ' мин' : ''}`
    : `${durationMins} мин`

  function onStartChange(t) {
    const dur = Math.max(15, timeToMins(form.endTime) - timeToMins(form.time))
    setForm(p => ({ ...p, time: t, endTime: minsToTime(timeToMins(t) + dur) }))
  }
  function onEndChange(t) {
    if (timeToMins(t) > timeToMins(form.time)) setForm(p => ({ ...p, endTime: t }))
  }

  function save() {
    onUpdate(item.id, form)
    setEditing(false)
  }

  const done = isDoneToday(item)
  const canToggle = canToggleItem(item)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:ic.light, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
              border:`2px solid ${ic.hex}33` }}>
              {cfg.icon}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
              <div style={{ fontSize:11, fontWeight:600, color:ic.hex, marginTop:1 }}>{cfg.label}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={() => setEditing(p => !p)} style={{
              background:'var(--surface2)', border:'none', borderRadius:8,
              padding:'6px 10px', fontSize:13, color:'var(--text2)', fontWeight:600 }}>
              {editing ? 'Отмена' : '✏️'}
            </button>
            <button onClick={onClose} style={{
              background:'var(--surface2)', border:'none', borderRadius:'50%',
              width:30, height:30, fontSize:16, color:'var(--text2)' }}>✕</button>
          </div>
        </div>

        {/* ── EDIT MODE ── */}
        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="label">Название</label>
              <input className="input" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>

            {/* Time range */}
            <div>
              <label className="label">Время</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Начало</div>
                  <input type="time" className="input" value={form.time} onChange={e => onStartChange(e.target.value)} />
                </div>
                <div style={{ color:'var(--text3)', fontSize:18, paddingTop:16 }}>→</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Конец</div>
                  <input type="time" className="input" value={form.endTime} onChange={e => onEndChange(e.target.value)} />
                </div>
              </div>
              {durationMins > 0 && (
                <div style={{ fontSize:11, color:'var(--primary)', fontWeight:600, marginTop:5, textAlign:'center' }}>
                  ⏱ {durLabel}
                </div>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="label">Частота</label>
              <select className="input" value={form.freq}
                onChange={e => setForm(p => ({ ...p, freq: e.target.value }))}>
                <option>Ежедневно</option>
                <option>По будням</option>
                <option>По выходным</option>
                <option>Раз в неделю</option>
                <option>Раз в 2 дня</option>
                <option>Разово</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="label">Цвет</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                {EVENT_COLORS.map(c => (
                  <button key={c.id} onClick={() => setForm(p => ({ ...p, color: c.id }))} style={{
                    width:26, height:26, borderRadius:'50%', background:c.hex, border:'none',
                    boxShadow: form.color===c.id ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : 'none',
                    transition:'all .15s', cursor:'pointer'
                  }} />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="label">Примечания</label>
              <textarea className="input" value={form.notes} rows={3} style={{ resize:'none' }}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <button className="btn btn-primary" onClick={save} style={{ width:'100%', padding:12 }}>
              ✓ Сохранить изменения
            </button>
          </div>

        ) : (
          /* ── VIEW MODE ── */
          <>
            {/* Details rows */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
              <DetailRow label="⏰ Время"
                value={item.endTime ? `${item.time} — ${item.endTime}` : item.time} />
              <DetailRow label="🔄 Частота" value={item.freq} />
              {item.notes && <DetailRow label="📝 Заметка" value={item.notes} />}
            </div>

            {/* Status badge */}
            <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:14, textAlign:'center',
              background: done ? 'var(--success-light)' : canToggle ? 'var(--warning-light)' : 'var(--surface2)',
              border: `1px solid ${done ? '#A7F3D0' : canToggle ? '#FDE68A' : 'var(--border)'}` }}>
              <span style={{ fontSize:13, fontWeight:600,
                color: done ? 'var(--success)' : canToggle ? 'var(--warning)' : 'var(--text3)' }}>
                {done ? '✅ Выполнено сегодня' : canToggle ? '⏳ Ожидает выполнения' : '🔒 День ещё не наступил'}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-danger" onClick={() => { onDelete(item.id); onClose() }}
                style={{ flex:1 }}>🗑</button>
              {canToggle ? (
                <button className="btn" onClick={() => { onToggle(item.id); onClose() }}
                  style={{ flex:3, background: done ? 'var(--surface2)' : 'var(--success)',
                    color: done ? 'var(--text2)' : 'white' }}>
                  {done ? '↩ Снять отметку' : '✓ Выполнено'}
                </button>
              ) : (
                <div style={{ flex:3, padding:'10px', background:'var(--surface2)',
                  border:'1px solid var(--border)', borderRadius:9, textAlign:'center',
                  fontSize:13, color:'var(--text3)', fontWeight:500 }}>
                  🔒 День ещё не наступил
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display:'flex', gap:12, padding:'10px 12px',
      background:'var(--surface2)', borderRadius:9 }}>
      <span style={{ fontSize:12, color:'var(--text3)', width:90, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{value}</span>
    </div>
  )
}
