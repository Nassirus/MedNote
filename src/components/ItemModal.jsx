import { useState } from 'react'
import { TypeIcon, IcPencil, IcTrash, IcCheckCircle, IcClock, IcLock, IcCalendar, IcX, IcCheck, IcTimer } from '../components/Icons'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { canToggleItem, isDoneToday, getToggleStatus, minsToTime, timeToMins } from '../lib/dateUtils'
import { format, parseISO, eachDayOfInterval, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ItemModal({ item, onClose, onDelete, onDeleteGroup, onDeleteDates, onToggle, onUpdate, allItems }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
  const ic  = EVENT_COLORS.find(c => c.id === item.color) || { hex: cfg.color, light: cfg.bg }

  const [editing, setEditing] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [form, setForm] = useState({
    title:   item.title   || '',
    time:    item.time    || '08:00',
    endTime: item.endTime || minsToTime(timeToMins(item.time || '08:00') + 30),
    notes:   item.notes   || '',
    freq:    item.freq    || 'Ежедневно',
    color:   item.color   || 'blue',
  })

  const done       = isDoneToday(item)
  const canToggle  = canToggleItem(item)
  const durationM  = Math.max(0, timeToMins(form.endTime) - timeToMins(form.time))
  const durLabel   = durationM >= 60 ? `${Math.floor(durationM/60)} ч${durationM%60?' '+durationM%60+' мин':''}` : `${durationM} мин`

  // Count how many items share this title+type (i.e. same course)
  const groupCount = allItems ? allItems.filter(i => i.title === item.title && i.type === item.type).length : 0

  function onStartChange(t) {
    const dur = Math.max(15, timeToMins(form.endTime) - timeToMins(form.time))
    setForm(p => ({ ...p, time: t, endTime: minsToTime(timeToMins(t) + dur) }))
  }
  function onEndChange(t) {
    if (timeToMins(t) > timeToMins(form.time)) setForm(p => ({ ...p, endTime: t }))
  }
  function save() { onUpdate(item.id, form); setEditing(false) }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:ic.light, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              border:`2px solid ${ic.hex}33` }}>
              {cfg.icon}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
              <div style={{ fontSize:11, fontWeight:600, color:ic.hex, marginTop:1 }}>{cfg.label}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={() => { setEditing(p=>!p); setShowDeleteMenu(false) }} style={{
              background:'var(--surface2)', border:'none', borderRadius:8, padding:'6px 10px', fontSize:13, color:'var(--text2)', fontWeight:600
            }}>{editing ? 'Отмена' : <IconPencil size={16}/>}</button>
            <button onClick={onClose} style={{ background:'var(--surface2)', border:'none', borderRadius:'50%', width:30, height:30, fontSize:16, color:'var(--text2)' }}>✕</button>
          </div>
        </div>

        {/* ── EDIT MODE ── */}
        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="label">Название</label>
              <input className="input" value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} />
            </div>
            <div>
              <label className="label">Время</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Начало</div>
                  <input type="time" className="input" value={form.time} onChange={e=>onStartChange(e.target.value)} />
                </div>
                <div style={{ color:'var(--text3)', fontSize:18, paddingTop:16 }}>→</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Конец</div>
                  <input type="time" className="input" value={form.endTime} onChange={e=>onEndChange(e.target.value)} />
                </div>
              </div>
              {durationM > 0 && <div style={{ fontSize:11, color:'var(--primary)', display:'flex', alignItems:'center', gap:3, fontWeight:600, marginTop:4, textAlign:'center' }}>⏱ {durLabel}</div>}
            </div>
            <div>
              <label className="label">Частота</label>
              <select className="input" value={form.freq} onChange={e=>setForm(p=>({...p,freq:e.target.value}))}>
                <option>Ежедневно</option><option>По будням</option><option>По выходным</option>
                <option>Раз в 2 дня</option><option>Раз в неделю</option><option>Разово</option>
              </select>
            </div>
            <div>
              <label className="label">Цвет</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                {EVENT_COLORS.map(c => (
                  <button key={c.id} onClick={() => setForm(p=>({...p,color:c.id}))} style={{
                    width:26, height:26, borderRadius:'50%', background:c.hex, border:'none', cursor:'pointer',
                    boxShadow: form.color===c.id ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : 'none'
                  }} />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Примечания</label>
              <textarea className="input" value={form.notes} rows={2} style={{ resize:'none' }}
                onChange={e=>setForm(p=>({...p,notes:e.target.value}))} />
            </div>
            <button className="btn btn-primary" onClick={save} style={{ width:'100%', padding:12 }}>Сохранить</button>
          </div>
        ) : (
          <>
            {/* Details */}
            <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
              <Row label="Время" value={item.endTime ? `${item.time} — ${item.endTime}` : item.time} />
              <Row label="Частота" value={item.freq || '—'} />
              {item.date && <Row label="Дата" value={format(parseISO(item.date),'d MMMM yyyy',{locale:ru})} />}
              {item.notes && <Row label="Заметка" value={item.notes} />}
              {groupCount > 1 && <Row label="Записей в курсе" value={`${groupCount} дней`} />}
            </div>

            {/* Status */}
            {(() => {
              const status = getToggleStatus(item)
              const [ih2, im2] = (item.time||'00:00').split(':').map(Number)
              const availTime = `${String(ih2).padStart(2,'0')}:${String(Math.max(0,im2-30)).padStart(2,'0')}`
              const configs = {
                done:      { bg:'var(--success-light)', border:'#A7F3D0', color:'var(--success)',  icon:<IconCheckCircle size={16}/>, text:'Выполнено сегодня' },
                available: { bg:'var(--warning-light)', border:'#FDE68A', color:'var(--warning)',  icon:<IconClock size={16}/>, text:'Ожидает выполнения' },
                too_early: { bg:'#EFF6FF',              border:'#BFDBFE', color:'var(--primary)',  icon:<IcClock size={16}/>, text:`Доступно с ${availTime} (за 30 мин до)` },
                past_day:  { bg:'var(--surface2)',      border:'var(--border)', color:'var(--text3)', icon:<IconLock size={16}/>, text:'Прошедший день — нельзя отметить' },
                future:    { bg:'var(--surface2)',      border:'var(--border)', color:'var(--text3)', icon:<IconCalendar size={16}/>, text:'Будущее событие — ещё не наступило' },
              }
              const cfg2 = configs[status] || configs.future
              return (
                <div style={{ padding:'9px 14px', borderRadius:10, marginBottom:14, textAlign:'center',
                  background:cfg2.bg, border:`1px solid ${cfg2.border}` }}>
                  <span style={{ fontSize:13, fontWeight:600, color:cfg2.color }}>
                    {cfg2.icon} {cfg2.text}
                  </span>
                </div>
              )
            })()}

            {/* ── DELETE MENU ── */}
            {showDeleteMenu ? (
              <div style={{ background:'var(--danger-light)', border:'1px solid #FECACA', borderRadius:12, padding:14, marginBottom:10 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--danger)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><IconTrash size={14}/>Выберите что удалить:</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {/* Delete just this day */}
                  <button onClick={() => { onDelete(item.id); onClose() }} style={{
                    padding:'11px 14px', borderRadius:9, border:'1.5px solid var(--border)', background:'white',
                    textAlign:'left', cursor:'pointer', fontSize:13
                  }}>
                    <div style={{ fontWeight:600, color:'var(--text)' }}>Только этот день</div>
                    {item.date && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                      {format(parseISO(item.date),'d MMMM yyyy',{locale:ru})}
                    </div>}
                  </button>
                  {/* Delete whole group (all days) — only if this is a course */}
                  {groupCount > 1 && (
                    <button onClick={() => { onDeleteGroup(item.title, item.type); onClose() }} style={{
                      padding:'11px 14px', borderRadius:9, border:'1.5px solid #FECACA', background:'#FFF5F5',
                      textAlign:'left', cursor:'pointer', fontSize:13
                    }}>
                      <div style={{ fontWeight:600, color:'var(--danger)' }}>Весь курс ({groupCount} дней)</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Удалить все записи назначения</div>
                    </button>
                  )}
                  <button onClick={() => setShowDeleteMenu(false)} className="btn btn-ghost" style={{ fontSize:13 }}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-danger" onClick={() => setShowDeleteMenu(true)} style={{ flex:1, display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}><IconTrash size={14}/>Удалить</button>
                {(() => {
                  const status2 = getToggleStatus(item)
                  if (status2 === 'done') return (
                    <button className="btn" onClick={() => { onToggle(item.id); onClose() }}
                      style={{ flex:3, background:'var(--surface2)', color:'var(--text2)' }}>
                      Снять отметку
                    </button>
                  )
                  if (status2 === 'available') return (
                    <button className="btn" onClick={() => { onToggle(item.id); onClose() }}
                      style={{ flex:3, background:'var(--success)', color:'white' }}>
                      ✓ Выполнено
                    </button>
                  )
                  const [ih3, im3] = (item.time||'00:00').split(':').map(Number)
                  const at = `${String(ih3).padStart(2,'0')}:${String(Math.max(0,im3-30)).padStart(2,'0')}`
                  const msgs = {
                    too_early: `Доступно с ${at}`,
                    past_day:  'Прошедший день',
                    future:    'Ещё не наступило',
                  }
                  return (
                    <div style={{ flex:3, padding:'10px', background:'var(--surface2)',
                      border:'1px solid var(--border)', borderRadius:9,
                      textAlign:'center', fontSize:13, color:'var(--text3)', fontWeight:500 }}>
                      {msgs[status2] || 'Заблокировано'}
                    </div>
                  )
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display:'flex', gap:12, padding:'9px 11px', background:'var(--surface2)', borderRadius:8 }}>
      <span style={{ fontSize:12, color:'var(--text3)', width:95, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{value}</span>
    </div>
  )
}
