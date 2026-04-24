import { useState } from 'react'
import { getPatientQRUrl } from '../lib/qrUtils'
import DoctorPortal from './DoctorPortal'
import { useAuth } from '../context/AuthContext'
// googleCalendar loaded lazily in handlers below
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid
} from 'recharts'

const WEEK = [
  { day:'Пн', pct:67 }, { day:'Вт', pct:100 }, { day:'Ср', pct:50 },
  { day:'Чт', pct:83 }, { day:'Пт', pct:100 }, { day:'Сб', pct:33 }, { day:'Вс', pct:67 },
]

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width:46, height:26, borderRadius:13,
        background: on ? 'var(--primary)' : 'var(--border2)',
        border:'none', position:'relative', transition:'background .2s',
        flexShrink:0, cursor:'pointer',
      }}>
      <div style={{
        width:19, height:19, borderRadius:'50%', background:'white',
        position:'absolute', top:3.5, left: on ? 23 : 4, transition:'left .2s',
      }}/>
    </button>
  )
}

// Google logo SVG
function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function Profile({ items = [], onOpenReport, onOpenEvents }) {
  const { profile, updateProfile, logout } = useAuth()

  // ── Notification settings ────────────────────────────────────────
  const [nd, setNd]       = useState(profile?.notify_delay || 30)
  const [qs, setQs]       = useState(profile?.quiet_start  || '22:00')
  const [qe, setQe]       = useState(profile?.quiet_end    || '08:00')
  const [notif, setNotif] = useState(profile?.notifications !== false)
  const [saved, setSaved] = useState(false)
  const [doctorMode, setDoctorMode] = useState(false)
  const [showQR, setShowQR] = useState(false)

  // ── MedIQ ────────────────────────────────────────────────────────
  const [mediq, setMediq]       = useState(profile?.mediq_sync || false)
  const [mediqUrl, setMediqUrl] = useState(profile?.mediq_url  || '')
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncMsg, setSyncMsg]   = useState('')
  const [copied, setCopied]     = useState(false)
  const [showMediqHelp, setShowMediqHelp] = useState(false)

  // ── Google Calendar ──────────────────────────────────────────────
  const [gcalLinked, setGcalLinked]   = useState(() => {
    try {
      const exp = parseInt(localStorage.getItem('gcal_token_exp') || '0')
      return Date.now() < exp && !!localStorage.getItem('gcal_token')
    } catch { return false }
  })
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalMsg, setGcalMsg]         = useState('')
  const [gcalMsgType, setGcalMsgType] = useState('info') // info | ok | err
  const [showGcalSteps, setShowGcalSteps] = useState(false)
  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

  function gcalInfo(msg)  { setGcalMsg(msg); setGcalMsgType('info')  }
  function gcalOk(msg)    { setGcalMsg(msg); setGcalMsgType('ok')    }
  function gcalErr(msg)   { setGcalMsg(msg); setGcalMsgType('err')   }

  async function handleConnectGCal() {
    setGcalLoading(true)
    gcalInfo('Открываем окно входа Google...')
    try {
      const gcal = await import('../lib/googleCalendar')
      await gcal.connectGoogleCalendar()
      setGcalLinked(true)
      gcalOk('Google Calendar подключён! Новые события MedNOTE автоматически появятся в вашем Google Календаре.')
    } catch (e) {
      setGcalLinked(false)
      gcalErr('Ошибка: ' + (e.message || String(e)))
    }
    setGcalLoading(false)
  }

  function handleDisconnectGCal() {
    try {
      localStorage.removeItem('gcal_token')
      localStorage.removeItem('gcal_token_exp')
    } catch {}
    setGcalLinked(false)
    setGcalMsg('')
  }

  async function handleSyncAll() {
    setGcalLoading(true)
    gcalInfo('Синхронизация...')
    try {
      const gcal = await import('../lib/googleCalendar')
      const { synced, failed } = await gcal.syncItemsToGCal(items)
      gcalOk(synced > 0
        ? 'Готово! ' + synced + ' событий добавлено в Google Calendar.' + (failed > 0 ? ' Ошибок: ' + failed : '')
        : 'Нет событий для синхронизации.')
    } catch (e) {
      gcalErr('Ошибка синхронизации: ' + (e.message || String(e)))
    }
    setGcalLoading(false)
  }

  // ── Profile stats ────────────────────────────────────────────────
  const name      = profile?.name || 'Пользователь'
  const initials  = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  const avg       = Math.round(WEEK.reduce((s,d) => s + d.pct, 0) / WEEK.length)
  const doneToday = items.filter(i => i.done).length

  function buildPayload() {
    return {
      source: 'MedNOTE', version: '2.0',
      patient_id: profile?.id || '',
      patient_name: name,
      exported_at: new Date().toISOString(),
      medications: items.filter(i=>i.type==='medication').map(i=>({ name:i.title, time:i.time, freq:i.freq, notes:i.notes||'' })),
      procedures:  items.filter(i=>['procedure','exercise','restriction'].includes(i.type)).map(i=>({ name:i.title, type:i.type, time:i.time, freq:i.freq })),
      restrictions: items.filter(i=>i.type==='restriction').map(i=>i.title),
      total_items: items.length,
    }
  }

  async function sendToMedIQ() {
    if (!mediqUrl.trim()) { setSyncStatus('err'); setSyncMsg('Введите URL MedIQ API'); return }
    setSyncStatus('sending'); setSyncMsg('')
    try {
      const res = await fetch(mediqUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      setSyncStatus('ok')
      setSyncMsg('Успешно: ' + buildPayload().medications.length + ' препаратов')
      await updateProfile({ mediq_last_sync: new Date().toISOString() })
    } catch(e) { setSyncStatus('err'); setSyncMsg('Ошибка: ' + e.message) }
  }

  function copyPayload() {
    navigator.clipboard.writeText(JSON.stringify(buildPayload(), null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function saveSettings() {
    await updateProfile({ notify_delay:nd, quiet_start:qs, quiet_end:qe, notifications:notif, mediq_sync:mediq, mediq_url:mediqUrl })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  // ── Gcal message style ───────────────────────────────────────────
  const gcalMsgStyle = {
    info: { bg: 'var(--primary-light)', color: 'var(--primary)', border: 'var(--primary-border)' },
    ok:   { bg: 'var(--success-light)', color: 'var(--success)', border: '#A7F3D0' },
    err:  { bg: 'var(--danger-light)',  color: 'var(--danger)',  border: '#FECACA' },
  }[gcalMsgType]

  if (doctorMode) return <DoctorPortal onBack={() => setDoctorMode(false)} />

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontWeight:700, fontSize:18 }}>Профиль</h1>
        <button className="btn btn-primary" onClick={saveSettings} style={{ fontSize:13, padding:'8px 16px' }}>
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="page-content" style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── User card ── */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:50, height:50, borderRadius:'50%', background:'var(--primary-light)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:800, fontSize:18, color:'var(--primary)', flexShrink:0 }}>
              {initials}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:16, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
              <div style={{ fontSize:13, color:'var(--text3)' }}>{profile?.email}</div>
            </div>
            <button className="btn btn-ghost" onClick={logout} style={{ fontSize:13, flexShrink:0 }}>Выйти ↩</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:14 }}>
            {[
              ['Сегодня', doneToday + '/' + items.length, 'var(--primary)'],
              ['Ср. неделя', avg + '%', avg >= 80 ? 'var(--success)' : 'var(--warning)'],
              ['Активных', String(items.length), 'var(--purple)'],
            ].map(([l,v,c]) => (
              <div key={l} style={{ background:'var(--surface2)', borderRadius:9, padding:'10px 8px', textAlign:'center' }}>
                <div style={{ fontWeight:800, fontSize:18, color:c }}>{v}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── My QR code for doctor ── */}
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: showQR ? 14 : 0 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>📱 Мой QR-код</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                Покажите врачу чтобы он добавил вас в свой список пациентов
              </div>
            </div>
            <button onClick={() => setShowQR(p => !p)} style={{
              padding:'7px 14px', borderRadius:10, border:'1.5px solid var(--primary)',
              background: showQR ? 'var(--primary)' : 'white',
              color: showQR ? 'white' : 'var(--primary)',
              fontWeight:700, fontSize:12, cursor:'pointer', flexShrink:0
            }}>
              {showQR ? 'Скрыть' : 'Показать QR'}
            </button>
          </div>
          {showQR && user && (
            <div style={{ textAlign:'center' }}>
              <img
                src={getPatientQRUrl(user.uid)}
                alt="QR-код пациента"
                style={{ width:200, height:200, borderRadius:12, border:'2px solid var(--border)' }}
              />
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:8, lineHeight:1.6 }}>
                Врач сканирует этот QR-код и получает доступ<br/>к вашему расписанию назначений
              </div>
            </div>
          )}
        </div>

        {/* ── Doctor portal shortcut ── */}
        <button onClick={() => setDoctorMode(true)} style={{
          display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
          background:'#EFF6FF', border:'1.5px solid #BFDBFE',
          borderLeft:'4px solid #2563EB', borderRadius:12,
          cursor:'pointer', textAlign:'left', width:'100%',
        }}>
          <span style={{ fontSize:22 }}>👨‍⚕️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'#1D4ED8' }}>Портал врача</div>
            <div style={{ fontSize:11, color:'#3B82F6', marginTop:2 }}>
              Управление назначениями пациентов и мониторинг
            </div>
          </div>
          <span style={{ color:'#93C5FD', fontSize:18 }}>›</span>
        </button>

        {/* ── Events manager shortcut ── */}
        {onOpenEvents && (
          <button onClick={onOpenEvents} style={{
            display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
            background:'white', border:'1px solid var(--primary-border)',
            borderLeft:'4px solid var(--primary)', borderRadius:12,
            cursor:'pointer', boxShadow:'var(--shadow)', textAlign:'left', width:'100%',
          }}>
            <span style={{ fontSize:22 }}>📋</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--primary)' }}>Все события</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Редактирование и удаление событий</div>
            </div>
            <span style={{ color:'var(--text3)', fontSize:18 }}>›</span>
          </button>
        )}

        {/* ── Google Calendar card ── */}
        <div className="card" style={{ padding:16 }}>

          {/* Title row */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#EFF6FF',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="1.8"/>
                <line x1="3" y1="9" x2="21" y2="9" stroke="#4285F4" strokeWidth="1.8"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="#4285F4" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="#4285F4" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="8"  cy="14" r="1.5" fill="#34A853"/>
                <circle cx="12" cy="14" r="1.5" fill="#FBBC04"/>
                <circle cx="16" cy="14" r="1.5" fill="#EA4335"/>
                <circle cx="8"  cy="18" r="1.5" fill="#4285F4"/>
                <circle cx="12" cy="18" r="1.5" fill="#34A853"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Google Calendar</span>
                {gcalLinked && (
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--success)',
                    background:'var(--success-light)', padding:'2px 8px', borderRadius:20 }}>
                    ● Активен
                  </span>
                )}
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                {gcalLinked
                  ? 'Новые события появляются в вашем Google Календаре автоматически'
                  : 'Синхронизируйте назначения с Google Календарём'}
              </div>
            </div>
          </div>

          {/* Status message */}
          {gcalMsg ? (
            <div style={{
              fontSize:12, padding:'9px 12px', borderRadius:8, marginBottom:10,
              lineHeight:1.5, border: '1px solid ' + gcalMsgStyle.border,
              background: gcalMsgStyle.bg, color: gcalMsgStyle.color,
            }}>
              {gcalMsg}
            </div>
          ) : null}

          {/* Case 1: CLIENT_ID not configured — show admin setup steps */}
          {!hasClientId && (
            <div>
              <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:9,
                padding:'10px 12px', marginBottom:10, fontSize:12, color:'#92400E', lineHeight:1.6 }}>
                ⚙️ Для активации администратор должен добавить <strong>VITE_GOOGLE_CLIENT_ID</strong> в переменные окружения Vercel.
              </div>
              <button
                onClick={() => setShowGcalSteps(p => !p)}
                style={{ width:'100%', padding:'9px', borderRadius:9,
                  border:'1px solid var(--border)', background:'var(--surface2)',
                  color:'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {showGcalSteps ? '▲ Скрыть инструкцию для разработчика' : '📖 Инструкция по настройке (для разработчика)'}
              </button>
              {showGcalSteps && (
                <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:7 }}>
                  {[
                    ['1', 'console.cloud.google.com', 'Открой и создай проект MedNOTE'],
                    ['2', 'Включи Google Calendar API', 'APIs & Services → Library → найди Google Calendar API → Enable'],
                    ['3', 'Создай OAuth Client ID', 'Credentials → + Create → OAuth 2.0 Client ID → тип: Web application'],
                    ['4', 'Укажи домен приложения', 'Authorized JS origins: https://med-note-dusky.vercel.app'],
                    ['5', 'Скопируй Client ID', 'Выглядит как: 123456789-abc.apps.googleusercontent.com'],
                    ['6', 'Добавь в Vercel', 'Project Settings → Environment Variables → VITE_GOOGLE_CLIENT_ID → Save → Redeploy'],
                  ].map(([n, title, desc]) => (
                    <div key={n} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', background:'#4285F4',
                        color:'white', fontWeight:800, fontSize:10,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0, marginTop:1 }}>{n}</div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{title}</div>
                        <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Case 2: CLIENT_ID configured, not yet connected */}
          {hasClientId && !gcalLinked && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6,
                background:'var(--surface2)', borderRadius:9, padding:'10px 12px' }}>
                После подключения ваши медицинские назначения из MedNOTE будут автоматически появляться в вашем Google Календаре с напоминаниями.
              </div>
              <button
                onClick={handleConnectGCal}
                disabled={gcalLoading}
                style={{
                  width:'100%', padding:'12px', borderRadius:9, border:'1.5px solid #4285F4',
                  background: gcalLoading ? 'var(--surface2)' : 'white',
                  color: gcalLoading ? 'var(--text3)' : '#4285F4',
                  fontWeight:700, fontSize:13, cursor: gcalLoading ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                {gcalLoading ? '⏳ Открываем Google...' : (
                  <>
                    <GoogleLogo size={18}/>
                    Войти через Google и подключить
                  </>
                )}
              </button>
            </div>
          )}

          {/* Case 3: Connected */}
          {hasClientId && gcalLinked && (
            <div style={{ display:'flex', gap:8 }}>
              <button
                onClick={handleSyncAll}
                disabled={gcalLoading}
                style={{
                  flex:2, padding:'10px', borderRadius:9, border:'none',
                  background: gcalLoading ? 'var(--surface2)' : 'var(--primary)',
                  color: gcalLoading ? 'var(--text3)' : 'white',
                  fontWeight:700, fontSize:12,
                  cursor: gcalLoading ? 'default' : 'pointer',
                }}>
                {gcalLoading ? '⏳ Синхронизация...' : '🔄 Синхронизировать все'}
              </button>
              <button
                onClick={handleDisconnectGCal}
                style={{ flex:1, padding:'10px', borderRadius:9,
                  border:'1px solid var(--border)', background:'white',
                  color:'var(--text3)', fontSize:12, cursor:'pointer' }}>
                Отключить
              </button>
            </div>
          )}
        </div>

        {/* ── Weekly chart ── */}
        <div className="card" style={{ padding:'14px 10px' }}>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--text)', marginBottom:10 }}>
            📊 Соблюдение за неделю
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={WEEK} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize:11, fill:'var(--text3)' }}/>
              <YAxis domain={[0,100]} axisLine={false} tickLine={false} tick={{ fontSize:10, fill:'var(--text3)' }}/>
              <Tooltip
                formatter={v => [v+'%', 'Выполнено']}
                contentStyle={{ borderRadius:8, border:'none', boxShadow:'var(--shadow-md)', fontSize:12 }}/>
              <Bar dataKey="pct" radius={[5,5,0,0]}>
                {WEEK.map((e,i) => (
                  <Cell key={i} fill={e.pct === 100 ? '#059669' : e.pct >= 60 ? '#2563EB' : '#F59E0B'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Report ── */}
        <div className="card" style={{ padding:'16px 18px' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:6 }}>📋 Отчёт для врача</div>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:14 }}>
            Детальный отчёт о соблюдении назначений для предъявления врачу.
          </p>
          <button className="btn" onClick={onOpenReport}
            style={{ width:'100%', padding:12, background:'var(--success)', color:'white', fontSize:14, fontWeight:700 }}>
            📋 Сформировать отчёт
          </button>
        </div>

        {/* ── MedIQ Sync ── */}
        <div className="card" style={{ padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:'#F0FDF4',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🧬</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Синхронизация с MedIQ</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>Передача данных в МИС врача</div>
            </div>
            <Toggle on={mediq} onChange={v => { setMediq(v); setSyncStatus(null) }}/>
          </div>
          {mediq && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <label className="label">URL MedIQ API</label>
                  <button onClick={() => setShowMediqHelp(p=>!p)}
                    style={{ background:'none', border:'none', fontSize:11, color:'var(--primary)', cursor:'pointer', fontWeight:600 }}>
                    {showMediqHelp ? '▲ Скрыть' : '? Как настроить'}
                  </button>
                </div>
                <input className="input" value={mediqUrl} onChange={e=>setMediqUrl(e.target.value)}
                  placeholder="https://api.mediq.app/v1/import"/>
              </div>
              {showMediqHelp && (
                <div style={{ background:'var(--primary-light)', border:'1px solid var(--primary-border)', borderRadius:10, padding:14 }}>
                  {[
                    ['1','Войдите в MedIQ','Зайдите в аккаунт на сайте MedIQ'],
                    ['2','Откройте API','Settings → Integrations → External Apps'],
                    ['3','Создайте интеграцию','Add Integration → выберите MedSchedule'],
                    ['4','Скопируйте Webhook URL','Вида: https://api.mediq.app/v1/import/TOKEN'],
                    ['5','Вставьте URL выше','Нажмите «Синхронизировать»'],
                  ].map(([n,title,desc]) => (
                    <div key={n} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--primary)',
                        color:'white', fontWeight:800, fontSize:11,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0, marginTop:1 }}>{n}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:12, color:'var(--text)' }}>{title}</div>
                        <div style={{ fontSize:11, color:'var(--text2)', marginTop:1, lineHeight:1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background:'var(--surface2)', borderRadius:9, padding:'10px 12px', fontSize:12, color:'var(--text3)' }}>
                💊 {items.filter(i=>i.type==='medication').length} препаратов ·{' '}
                🩺 {items.filter(i=>['procedure','exercise'].includes(i.type)).length} процедур ·{' '}
                ⚠️ {items.filter(i=>i.type==='restriction').length} ограничений
              </div>
              {syncStatus === 'ok'  && <div style={{ padding:'10px 12px', background:'var(--success-light)', border:'1px solid #A7F3D0', borderRadius:9, fontSize:13, color:'var(--success)' }}>✅ {syncMsg}</div>}
              {syncStatus === 'err' && <div style={{ padding:'10px 12px', background:'var(--danger-light)', border:'1px solid #FECACA', borderRadius:9, fontSize:13, color:'var(--danger)' }}>❌ {syncMsg}</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary" onClick={sendToMedIQ}
                  disabled={syncStatus==='sending'} style={{ flex:2, padding:11 }}>
                  {syncStatus === 'sending' ? '⏳ Отправка...' : '🔄 Синхронизировать'}
                </button>
                <button className="btn btn-ghost" onClick={copyPayload}
                  style={{ flex:1, padding:11, fontSize:12 }}>
                  {copied ? '✓ Скопировано' : '📋 JSON'}
                </button>
              </div>
              {profile?.mediq_last_sync && (
                <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center' }}>
                  Последняя синхронизация: {new Date(profile.mediq_last_sync).toLocaleString('ru')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Notifications ── */}
        <div className="card" style={{ padding:'16px 18px' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:14 }}>🔔 Уведомления</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            paddingBottom:12, borderBottom:'1px solid var(--border)', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500 }}>Push-уведомления</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>Напоминания о приёмах</div>
            </div>
            <Toggle on={notif} onChange={setNotif}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label className="label">Напомнить через (если не отмечено)</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
              {[5,10,15,30,45,60,120].map(m => (
                <button key={m} onClick={() => setNd(m)} style={{
                  padding:'6px 12px', borderRadius:20, border:'none', fontSize:12,
                  fontWeight:600, cursor:'pointer',
                  background: nd === m ? 'var(--primary)' : 'var(--surface2)',
                  color: nd === m ? 'white' : 'var(--text3)',
                }}>{m} мин</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Режим тишины</label>
            <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginTop:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>С</div>
                <input type="time" className="input" value={qs} onChange={e=>setQs(e.target.value)}/>
              </div>
              <span style={{ color:'var(--border2)', paddingBottom:9, fontSize:18 }}>—</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>До</div>
                <input type="time" className="input" value={qe} onChange={e=>setQe(e.target.value)}/>
              </div>
            </div>
          </div>
        </div>

        {/* ── Coming soon ── */}
        <div style={{ background:'var(--surface2)', border:'1px dashed var(--border2)',
          borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>👁️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>Мониторинг опекуна</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>Контроль выполнения назначений для родственников — в разработке</div>
          </div>
          <div style={{ padding:'3px 10px', borderRadius:20, background:'var(--warning-light)',
            fontSize:11, fontWeight:700, color:'var(--warning)', whiteSpace:'nowrap' }}>Скоро</div>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--text3)', paddingBottom:8 }}>
          MedNOTE v2.0 · Firebase + Gemini AI
        </p>

      </div>
    </div>
  )
}
