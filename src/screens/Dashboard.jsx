import { useState } from 'react'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { isItemToday, isDoneToday, canToggleItem } from '../lib/dateUtils'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

function itemColor(item) {
  if (item.color) {
    const c = EVENT_COLORS.find(c => c.id === item.color)
    if (c) return c
  }
  const cfg = TYPE_CONFIG[item.type]
  return { hex: cfg?.color || '#2563EB', light: cfg?.bg || '#EFF6FF' }
}

export default function Dashboard({ items, toggle, add, remove, update, dbError, onOpenEvents }) {
  const { profile } = useAuth()
  const [showAdd, setShowAdd]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter]     = useState('all')

  const today    = new Date()
  const hour     = today.getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер'
  const name     = profile?.name?.split(' ')[0] || 'друг'
  const dateStr  = format(today, 'd MMMM, EEEE', { locale: ru })

  const todayItems = items.filter(isItemToday)
  const sorted     = [...todayItems].sort((a,b) => (a.time||'').localeCompare(b.time||''))
  const filtered   = filter === 'all'    ? sorted
                   : filter === 'done'   ? sorted.filter(isDoneToday)
                   : sorted.filter(i => !isDoneToday(i))

  const done  = todayItems.filter(isDoneToday).length
  const total = todayItems.length
  const pct   = total ? Math.round(done / total * 100) : 0

  const nowMin  = hour * 60 + today.getMinutes()
  const upcoming = sorted.find(i => {
    if (isDoneToday(i)) return false
    const [h, m] = (i.time || '00:00').split(':').map(Number)
    return h * 60 + m >= nowMin
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
      <div className="page-header">
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>{dateStr}</div>
          <h1 style={{ fontWeight:700, fontSize:18, color:'var(--text)' }}>{greeting}, {name}!</h1>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          {onOpenEvents && (
            <button className="btn btn-ghost" onClick={onOpenEvents}
              style={{ padding:'8px 10px', fontSize:13 }}>
              📋
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}
            style={{ padding:'8px 14px', fontSize:13 }}>
            + Добавить
          </button>
        </div>
      </div>

      <div className="page-content">
        {dbError && dbError !== 'index' && (
          <div style={{ background:'var(--danger-light)', border:'1px solid #FECACA', borderRadius:10, padding:'11px 14px',
            marginBottom:12, fontSize:12, color:'var(--danger)', lineHeight:1.6, display:'flex', alignItems:'flex-start', gap:8 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
            <div>
              <strong>Ошибка:</strong> {dbError}<br/>
              {dbError.includes('прав') && <span>Открой <strong>Firebase Console → Firestore → Rules</strong> и опубликуй правила из файла <code>firestore.rules</code></span>}
            </div>
          </div>
        )}
        {dbError === 'index' && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'11px 14px',
            marginBottom:16, fontSize:12, color:'#92400E', lineHeight:1.6 }}>
            ⚠️ Нужен индекс Firestore: <strong>Firebase Console → Firestore → Indexes → Add composite index</strong><br/>
            Collection: <code>schedule_items</code> | Fields: <code>user_id ASC, time ASC</code>
          </div>
        )}

        {/* Hero banner */}
        <div className="hero-banner" style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4 }}>Выполнение сегодня</div>
              <div style={{ fontSize:42, fontWeight:800, lineHeight:1, marginBottom:4 }}>
                {pct}<span style={{ fontSize:20 }}>%</span>
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>{done} из {total} пунктов</div>
            </div>
            <svg width="64" height="64" style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6"/>
              <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="6"
                strokeDasharray={`${2*Math.PI*26}`}
                strokeDashoffset={`${2*Math.PI*26*(1-pct/100)}`}
                strokeLinecap="round"
                style={{ transition:'stroke-dashoffset .5s ease' }}/>
            </svg>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.2)', borderRadius:99, marginTop:14, overflow:'hidden' }}>
            <div style={{ height:5, width:pct+'%', background:'white', borderRadius:99, transition:'width .5s ease' }}/>
          </div>
          {upcoming && (
            <div style={{ marginTop:12, padding:'9px 12px', background:'rgba(255,255,255,0.15)', borderRadius:9,
              display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>⏭️</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.8)' }}>Следующее: </span>
              <span style={{ fontSize:12, fontWeight:700, color:'white', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {upcoming.title}
              </span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.8)', flexShrink:0 }}>{upcoming.time}</span>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[['all',`Все (${total})`],['pending',`Ожидает (${total-done})`],['done',`Готово (${done})`]].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding:'6px 12px', borderRadius:20, border:'none', fontSize:12, fontWeight:600,
              background: filter===k ? 'var(--primary)' : 'white',
              color: filter===k ? 'white' : 'var(--text3)',
              boxShadow: filter===k ? 'none' : 'var(--shadow)', transition:'all .15s'
            }}>{l}</button>
          ))}
        </div>

        {/* List */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div style={{ fontSize:44, marginBottom:12 }}>
                {total===0 ? '📋' : filter==='done'&&done===0 ? '⏳' : '🎉'}
              </div>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:6 }}>
                {total===0 ? 'Расписание пустое' : filter==='done'&&done===0 ? 'Ещё ничего не выполнено' : 'Всё выполнено!'}
              </div>
              {total===0 && (
                <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop:10 }}>
                  + Добавить первую задачу
                </button>
              )}
            </div>
          )}
          {filtered.map(item => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
            const ic  = itemColor(item)
            return (
              <div key={item.id} style={{
                background:'white', borderRadius:14, padding:'12px 14px',
                display:'flex', alignItems:'center', gap:12,
                border:`1px solid ${isDoneToday(item) ? 'var(--border)' : ic.hex+'33'}`,
                borderLeft:`4px solid ${isDoneToday(item) ? 'var(--border)' : ic.hex}`,
                opacity: isDoneToday(item) ? 0.6 : 1, transition:'all .2s',
                boxShadow: item.done ? 'none' : 'var(--shadow)'
              }}>
                <div style={{ width:44, height:44, borderRadius:12, background:ic.light,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => setSelected(item)}>
                  <div style={{ fontWeight:600, fontSize:14, color:'var(--text)',
                    textDecoration: isDoneToday(item) ? 'line-through' : 'none',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {item.title}
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, color:'var(--text3)', fontWeight:500 }}>⏰ {item.time}</span>
                    <span style={{ padding:'2px 8px', borderRadius:99, background:ic.light,
                      color:ic.hex, fontSize:10, fontWeight:700 }}>{cfg.label}</span>
                    {item.notes && (
                      <span style={{ fontSize:11, color:'var(--text3)', overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>
                        {item.notes}
                      </span>
                    )}
                  </div>
                </div>
                {canToggleItem(item) ? (
                  <button onClick={() => toggle(item.id)} style={{
                    width:28, height:28, borderRadius:'50%',
                    border:`2.5px solid ${isDoneToday(item) ? '#059669' : ic.hex}`,
                    background: isDoneToday(item) ? '#059669' : 'white', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow: isDoneToday(item) ? '0 0 0 3px #D1FAE5' : 'none', transition:'all .2s'
                  }}>
                    {isDoneToday(item) && <span style={{ color:'white', fontSize:13, fontWeight:700 }}>✓</span>}
                  </button>
                ) : (
                  <div title="День ещё не наступил" style={{
                    width:28, height:28, borderRadius:'50%', flexShrink:0,
                    border:'2px solid #CBD5E1', background:'#F8FAFC',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, cursor:'default'
                  }}>🔒</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showAdd && <AddItemModal onAdd={add} onClose={() => setShowAdd(false)} existingItems={items} />}
      {selected && <ItemModal item={selected} onClose={() => setSelected(null)} onDelete={remove} onDeleteGroup={() => {}} onDeleteDates={() => {}} onToggle={toggle} onUpdate={update} allItems={items} />}
    </div>
  )
}
