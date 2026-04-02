import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

const WEEK = [
  {day:'Пн',pct:67},{day:'Вт',pct:100},{day:'Ср',pct:50},
  {day:'Чт',pct:83},{day:'Пт',pct:100},{day:'Сб',pct:33},{day:'Вс',pct:67}
]

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width:46, height:26, borderRadius:13, background: on ? 'var(--primary)' : 'var(--border2)',
      border:'none', position:'relative', transition:'background .2s', flexShrink:0, cursor:'pointer'
    }}>
      <div style={{ width:19, height:19, borderRadius:'50%', background:'white', position:'absolute', top:3.5, left: on ? 23 : 4, transition:'left .2s' }} />
    </button>
  )
}

export default function Profile({ items, onOpenReport, onOpenEvents }) {
  const { profile, updateProfile, logout } = useAuth()
  const [nd, setNd]       = useState(profile?.notify_delay || 30)
  const [qs, setQs]       = useState(profile?.quiet_start  || '22:00')
  const [qe, setQe]       = useState(profile?.quiet_end    || '08:00')
  const [notif, setNotif] = useState(profile?.notifications !== false)
  const [mediq, setMediq] = useState(profile?.mediq_sync   || false)
  const [mediqUrl, setMediqUrl] = useState(profile?.mediq_url || '')
  const [saved, setSaved] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncMsg, setSyncMsg]   = useState('')
  const [copied, setCopied]     = useState(false)
  const [showMediqHelp, setShowMediqHelp] = useState(false)

  const name     = profile?.name || 'Пользователь'
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const avg      = Math.round(WEEK.reduce((s,d) => s+d.pct, 0) / WEEK.length)
  const doneToday = items.filter(i=>i.done).length

  function buildPayload() {
    return {
      source: 'MedSchedule', version: '2.0',
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
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(buildPayload())
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSyncStatus('ok')
      setSyncMsg(`Успешно: ${buildPayload().medications.length} препаратов`)
      await updateProfile({ mediq_last_sync: new Date().toISOString() })
    } catch(e) {
      setSyncStatus('err')
      setSyncMsg('Ошибка: ' + e.message)
    }
  }

  function copyPayload() {
    navigator.clipboard.writeText(JSON.stringify(buildPayload(), null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function saveSettings() {
    await updateProfile({ notify_delay:nd, quiet_start:qs, quiet_end:qe, notifications:notif, mediq_sync:mediq, mediq_url:mediqUrl })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="page-header">
        <h1 style={{ fontWeight:700, fontSize:18 }}>Профиль</h1>
        <button className="btn btn-primary" onClick={saveSettings} style={{ fontSize:13, padding:'8px 16px' }}>
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="page-content" style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {onOpenEvents && (
          <button onClick={onOpenEvents} style={{
            display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
            background:'white', border:'1px solid var(--primary-border)',
            borderLeft:'4px solid var(--primary)', borderRadius:12,
            cursor:'pointer', boxShadow:'var(--shadow)', textAlign:'left', width:'100%'
          }}>
            <span style={{ fontSize:22 }}>📋</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--primary)' }}>Все события</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Редактирование и удаление событий</div>
            </div>
            <span style={{ color:'var(--text3)', fontSize:18 }}>›</span>
          </button>
        )}

        {/* User */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:50, height:50, borderRadius:'50%', background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:18, color:'var(--primary)', flexShrink:0 }}>{initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>{name}</div>
              <div style={{ fontSize:13, color:'var(--text3)' }}>{profile?.email}</div>
            </div>
            <button className="btn btn-ghost" onClick={logout} style={{ fontSize:13 }}>Выйти ↩</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:14 }}>
            {[['Сегодня',`${doneToday}/${items.length}`,'var(--primary)'],['Ср. неделя',`${avg}%`,avg>=80?'var(--success)':'var(--warning)'],['Активных',`${items.length}`,'var(--purple)']].map(([l,v,c]) => (
              <div key={l} style={{ background:'var(--surface2)', borderRadius:9, padding:'10px 8px', textAlign:'center' }}>
                <div style={{ fontWeight:800, fontSize:18, color:c }}>{v}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="card" style={{ padding:'14px 10px' }}>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--text)', marginBottom:10 }}>📊 Соблюдение за неделю</div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={WEEK} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--text3)'}} />
              <YAxis domain={[0,100]} axisLine={false} tickLine={false} tick={{fontSize:10,fill:'var(--text3)'}} />
              <Tooltip formatter={v=>[v+'%','Выполнено']} contentStyle={{borderRadius:8,border:'none',boxShadow:'var(--shadow-md)',fontSize:12}} />
              <Bar dataKey="pct" radius={[5,5,0,0]}>
                {WEEK.map((e,i) => <Cell key={i} fill={e.pct===100?'#059669':e.pct>=60?'#2563EB':'#F59E0B'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Report */}
        <div className="card" style={{ padding:'16px 18px' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:6 }}>📋 Отчёт для врача</div>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:14 }}>Детальный отчёт о соблюдении назначений с графиками для предъявления врачу.</p>
          <button className="btn" onClick={onOpenReport} style={{ width:'100%', padding:12, background:'var(--success)', color:'white', fontSize:14, fontWeight:700 }}>
            📋 Сформировать и распечатать отчёт
          </button>
        </div>

        {/* MedIQ Sync */}
        <div className="card" style={{ padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🧬</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Синхронизация с MedIQ</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>Передача данных о препаратах в MedIQ AI</div>
            </div>
            <Toggle on={mediq} onChange={v => { setMediq(v); setSyncStatus(null) }} />
          </div>

          {mediq && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <label className="label">URL MedIQ API</label>
                  <button onClick={() => setShowMediqHelp(p=>!p)} style={{ background:'none', border:'none', fontSize:11, color:'var(--primary)', cursor:'pointer', fontWeight:600 }}>
                    {showMediqHelp ? '▲ Скрыть' : '? Как настроить'}
                  </button>
                </div>
                <input className="input" value={mediqUrl} onChange={e => setMediqUrl(e.target.value)}
                  placeholder="https://api.mediq.app/v1/import" />
              </div>

              {/* MedIQ Setup Instructions */}
              {showMediqHelp && (
                <div style={{ background:'var(--primary-light)', border:'1px solid var(--primary-border)', borderRadius:10, padding:14 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--primary)', marginBottom:10 }}>📖 Как подключить MedIQ</div>
                  {[
                    ['1', 'Войдите в MedIQ', 'Зайдите в ваш аккаунт MedIQ на сайте или в приложении'],
                    ['2', 'Откройте настройки API', 'Перейдите в Settings → Integrations → External Apps'],
                    ['3', 'Создайте подключение', 'Нажмите "Add Integration" → выберите "MedSchedule" или "Custom"'],
                    ['4', 'Скопируйте Webhook URL', 'Скопируйте ссылку вида: https://api.mediq.app/v1/import/TOKEN'],
                    ['5', 'Вставьте URL выше', 'Вставьте скопированный URL в поле "URL MedIQ API" и нажмите "Синхронизировать"'],
                  ].map(([n, title, desc]) => (
                    <div key={n} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--primary)', color:'white', fontWeight:800, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{n}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:12, color:'var(--text)' }}>{title}</div>
                        <div style={{ fontSize:11, color:'var(--text2)', marginTop:1, lineHeight:1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop:10, padding:'8px 10px', background:'white', borderRadius:8, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Что передаётся:</div>
                    <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.7 }}>
                      💊 Препараты и дозировки · 🩺 Процедуры · ⚠️ Ограничения<br/>
                      Данные передаются в формате JSON через безопасное HTTPS соединение
                    </div>
                  </div>
                </div>
              )}

              {/* Payload preview */}
              <div style={{ background:'var(--surface2)', borderRadius:9, padding:'10px 12px', fontSize:12, color:'var(--text3)' }}>
                💊 {items.filter(i=>i.type==='medication').length} препаратов ·
                🩺 {items.filter(i=>['procedure','exercise'].includes(i.type)).length} процедур ·
                ⚠️ {items.filter(i=>i.type==='restriction').length} ограничений
              </div>

              {syncStatus === 'ok' && <div style={{ padding:'10px 12px', background:'var(--success-light)', border:'1px solid #A7F3D0', borderRadius:9, fontSize:13, color:'var(--success)' }}>✅ {syncMsg}</div>}
              {syncStatus === 'err' && <div style={{ padding:'10px 12px', background:'var(--danger-light)', border:'1px solid #FECACA', borderRadius:9, fontSize:13, color:'var(--danger)', lineHeight:1.5 }}>❌ {syncMsg}</div>}

              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary" onClick={sendToMedIQ} disabled={syncStatus==='sending'} style={{ flex:2, padding:11 }}>
                  {syncStatus==='sending' ? '⏳ Отправка...' : '🔄 Синхронизировать'}
                </button>
                <button className="btn btn-ghost" onClick={copyPayload} style={{ flex:1, padding:11, fontSize:12 }}>
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

        {/* Notifications */}
        <div className="card" style={{ padding:'16px 18px' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:14 }}>🔔 Уведомления</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:12, borderBottom:'1px solid var(--border)', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500 }}>Push-уведомления</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>Напоминания о приёмах</div>
            </div>
            <Toggle on={notif} onChange={setNotif} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label className="label">Напомнить повторно через (если не отмечено)</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
              {[5,10,15,30,45,60,120].map(m => (
                <button key={m} onClick={() => setNd(m)} style={{
                  padding:'6px 12px', borderRadius:20, border:'none', fontSize:12, fontWeight:600,
                  background: nd===m ? 'var(--primary)' : 'var(--surface2)',
                  color: nd===m ? 'white' : 'var(--text3)', transition:'all .12s', cursor:'pointer'
                }}>{m} мин</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Режим тишины</label>
            <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginTop:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>С</div>
                <input type="time" className="input" value={qs} onChange={e => setQs(e.target.value)} />
              </div>
              <span style={{ color:'var(--border2)', paddingBottom:9, fontSize:18 }}>—</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>До</div>
                <input type="time" className="input" value={qe} onChange={e => setQe(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Coming soon */}
        <div style={{ background:'var(--surface2)', border:'1px dashed var(--border2)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>👁️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>Мониторинг опекуна</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>Наблюдение за выполнением назначений в реальном времени — в разработке</div>
          </div>
          <div style={{ padding:'3px 10px', borderRadius:20, background:'var(--warning-light)', fontSize:11, fontWeight:700, color:'var(--warning)', whiteSpace:'nowrap' }}>Скоро</div>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--text3)', paddingBottom:8 }}>MedSchedule v2.0 · Firebase + Gemini AI</p>
      </div>
    </div>
  )
}
