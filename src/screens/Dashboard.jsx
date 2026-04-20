import { useState, useEffect, useRef } from 'react'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { isItemToday, isDoneToday, canToggleItem, getToggleStatus } from '../lib/dateUtils'
import AddItemModal from '../components/AddItemModal'
import ItemModal from '../components/ItemModal'
import StreakBadge from '../components/StreakBadge'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  registerServiceWorker,
  requestNotificationPermission,
  buildReminderChecker,
  scheduleMorningSummary
} from '../lib/notifications'
import { useStreak } from '../hooks/useStreak'

function itemColor(item) {
  if (item.color) {
    const c = EVENT_COLORS.find(c => c.id === item.color)
    if (c) return c
  }
  const cfg = TYPE_CONFIG[item.type]
  return { hex: cfg?.color || '#2563EB', light: cfg?.bg || '#EFF6FF' }
}

export default function Dashboard({ items, toggle, add, remove, update, dbError, onOpenEvents }) {
  const { user, profile } = useAuth()
  const [showAdd, setShowAdd]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter]     = useState('all')
  const [notifStatus, setNotifStatus] = useState('unknown') // unknown|granted|denied|unsupported
  const intervalRef = useRef(null)

  // ── Streak ──────────────────────────────────────────────────────────
  const { streak, visual: streakVisual, milestone: streakMilestone } = useStreak(user, items)

  // ── Notifications setup ─────────────────────────────────────────────
  useEffect(() => {
    registerServiceWorker()
    setNotifStatus(
      !('Notification' in window) ? 'unsupported'
      : Notification.permission === 'granted' ? 'granted'
      : Notification.permission === 'denied'  ? 'denied'
      : 'default'
    )
  }, [])

  // ── Reminder checker — runs every 2 minutes ─────────────────────────
  useEffect(() => {
    if (notifStatus !== 'granted') return
    const delay = (profile?.notify_delay ?? 30)
    const check = buildReminderChecker(items, delay)
    scheduleMorningSummary(items)
    check() // run immediately
    intervalRef.current = setInterval(check, 2 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [items, notifStatus, profile])

  async function enableNotifications() {
    const result = await requestNotificationPermission()
    setNotifStatus(result)
  }

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
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {/* Streak badge */}
          <StreakBadge streak={streak} visual={streakVisual} milestone={streakMilestone} />

          {/* Notification bell */}
          {notifStatus !== 'unsupported' && notifStatus !== 'granted' && (
            <button onClick={enableNotifications} title="Включить уведомления"
              style={{ background:'var(--warning-light)', border:'none', borderRadius:8,
                width:36, height:36, fontSize:16, cursor:'pointer', flexShrink:0 }}>
              🔔
            </button>
          )}
          {notifStatus === 'granted' && (
            <div title="Уведомления включены"
              style={{ width:36, height:36, borderRadius:8, background:'var(--success-light)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
              🔔
            </div>
          )}

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
        {items.length === 0 && !loading && (
          <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', color:'#0369A1',
            padding:'10px 14px', borderRadius:9, fontSize:12, marginBottom:8, lineHeight:1.8 }}>
            🔍 <strong>Диагностика:</strong> uid: {user?.uid?.slice(0,8)}... | dbError: {String(dbError)} | loading: {String(loading)}
          </div>
        )}
        {/* Notification permission prompt */}
        {notifStatus === 'default' && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10,
            padding:'11px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>🔔</span>
            <div style={{ flex:1, fontSize:12, color:'#92400E', lineHeight:1.5 }}>
              <strong>Включите уведомления</strong> — MedNOTE будет напоминать о приёме лекарств
            </div>
            <button onClick={enableNotifications}
              style={{ background:'#F59E0B', border:'none', borderRadius:8, padding:'6px 12px',
                fontSize:12, fontWeight:700, color:'white', cursor:'pointer', flexShrink:0 }}>
              Включить
            </button>
          </div>
        )}
        {notifStatus === 'denied' && (
          <div style={{ background:'var(--danger-light)', border:'1px solid #FECACA', borderRadius:10,
            padding:'10px 14px', marginBottom:12, fontSize:12, color:'var(--danger)' }}>
            🔕 Уведомления заблокированы. Разрешите в настройках браузера.
          </div>
        )}
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
                {(() => {
                  const status = getToggleStatus(item)
                  if (status === 'done') return (
                    <button onClick={() => toggle(item.id)} title="Снять отметку" style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      border:'2.5px solid #059669', background:'#059669',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:'0 0 0 3px #D1FAE5', transition:'all .2s', cursor:'pointer'
                    }}>
                      <span style={{ color:'white', fontSize:13, fontWeight:700 }}>✓</span>
                    </button>
                  )
                  if (status === 'available') return (
                    <button onClick={() => toggle(item.id)} title="Отметить выполненным" style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      border:`2.5px solid ${ic.hex}`, background:'white',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      transition:'all .2s', cursor:'pointer'
                    }} />
                  )
                  if (status === 'too_early') {
                    const [ih2, im2] = (item.time||'00:00').split(':').map(Number)
                    const avail = `${String(ih2).padStart(2,'0')}:${String(Math.max(0,im2-30)).padStart(2,'0')}`
                    return (
                      <div title={`Доступно с ${avail}`} style={{
                        width:28, height:28, borderRadius:'50%', flexShrink:0,
                        border:'2px solid #FDE68A', background:'#FFFBEB',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, cursor:'default'
                      }}>⏳</div>
                    )
                  }
                  if (status === 'past_day') return (
                    <div title="Прошедший день — нельзя отметить" style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      border:'2px solid #CBD5E1', background:'#F8FAFC',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, cursor:'default'
                    }}>🔒</div>
                  )
                  // future
                  return (
                    <div title="Будущее событие" style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      border:'2px solid #BFDBFE', background:'#EFF6FF',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, cursor:'default'
                    }}>📅</div>
                  )
                })()}
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
