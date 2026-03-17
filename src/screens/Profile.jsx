import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { TYPE_CONFIG } from '../constants'

const WEEK = [
  { day:'Пн',pct:67 },{ day:'Вт',pct:100 },{ day:'Ср',pct:50 },
  { day:'Чт',pct:83 },{ day:'Пт',pct:100 },{ day:'Сб',pct:33 },{ day:'Вс',pct:67 }
]

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 46, height: 26, borderRadius: 13,
      background: on ? 'var(--primary)' : 'var(--border2)',
      border: 'none', position: 'relative', transition: 'background .2s', flexShrink: 0
    }}>
      <div style={{ width: 19, height: 19, borderRadius: '50%', background: 'white', position: 'absolute', top: 3.5, left: on ? 23 : 4, transition: 'left .2s' }} />
    </button>
  )
}

export default function Profile({ items }) {
  const { profile, updateProfile, logout } = useAuth()

  const [nd, setNd]       = useState(profile?.notify_delay || 30)
  const [qs, setQs]       = useState(profile?.quiet_start  || '22:00')
  const [qe, setQe]       = useState(profile?.quiet_end    || '08:00')
  const [notif, setNotif] = useState(profile?.notifications !== false)
  const [mediq, setMediq] = useState(profile?.mediq_sync   || false)
  const [mediqUrl, setMediqUrl] = useState(profile?.mediq_url || '')
  const [saved, setSaved] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null) // null | 'sending' | 'ok' | 'err'
  const [syncMsg, setSyncMsg]   = useState('')
  const [copied, setCopied]     = useState(false)

  const name     = profile?.name || 'Пользователь'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const avg      = Math.round(WEEK.reduce((s, d) => s + d.pct, 0) / WEEK.length)
  const doneToday = items.filter(i => i.done).length

  // Build MedIQ payload — medications and procedures
  function buildMedIQPayload() {
    const medications = items
      .filter(i => i.type === 'medication')
      .map(i => ({ name: i.title, time: i.time, freq: i.freq, notes: i.notes || '' }))

    const procedures = items
      .filter(i => ['procedure','exercise','restriction'].includes(i.type))
      .map(i => ({ name: i.title, type: i.type, time: i.time, freq: i.freq }))

    return {
      source: 'MedSchedule',
      version: '2.0',
      patient_id: profile?.id || '',
      patient_name: name,
      exported_at: new Date().toISOString(),
      medications,
      procedures,
      total_items: items.length,
    }
  }

  async function sendToMedIQ() {
    if (!mediqUrl.trim()) {
      setSyncStatus('err')
      setSyncMsg('Введите URL вашего MedIQ сервиса')
      return
    }
    setSyncStatus('sending')
    setSyncMsg('')
    const payload = buildMedIQPayload()
    try {
      const res = await fetch(mediqUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSyncStatus('ok')
      setSyncMsg(`Отправлено успешно: ${payload.medications.length} препаратов, ${payload.procedures.length} процедур`)
      await updateProfile({ mediq_last_sync: new Date().toISOString() })
    } catch (e) {
      setSyncStatus('err')
      setSyncMsg('Ошибка: ' + e.message + '. Проверьте URL и CORS настройки MedIQ.')
    }
  }

  function copyPayload() {
    const payload = buildMedIQPayload()
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveSettings() {
    await updateProfile({
      notify_delay: nd,
      quiet_start: qs,
      quiet_end: qe,
      notifications: notif,
      mediq_sync: mediq,
      mediq_url: mediqUrl,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h1 style={{ fontWeight: 700, fontSize: 18 }}>Профиль и настройки</h1>
        <button className="btn btn-primary" onClick={saveSettings} style={{ fontSize: 13, padding: '8px 16px' }}>
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* User card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'var(--primary)', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{name}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 1 }}>{profile?.email || ''}</div>
            </div>
            <button className="btn btn-ghost" onClick={logout} style={{ fontSize: 13, flexShrink: 0 }}>Выйти ↩</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
            {[
              ['Сегодня',    `${doneToday}/${items.length}`, 'var(--primary)'],
              ['Ср. неделя', `${avg}%`,                     avg >= 80 ? 'var(--success)' : 'var(--warning)'],
              ['Активных',   `${items.length}`,              'var(--purple)'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="card" style={{ padding: '16px 12px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>📊 Соблюдение за неделю</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={WEEK} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text3)' }} />
              <YAxis domain={[0,100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text3)' }} />
              <Tooltip formatter={v => [v+'%','Выполнено']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: 'var(--shadow-md)', fontSize: 12 }} />
              <Bar dataKey="pct" radius={[5,5,0,0]}>
                {WEEK.map((e,i) => <Cell key={i} fill={e.pct===100?'#059669':e.pct>=60?'#2563EB':'#F59E0B'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── MedIQ Sync ── */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧬</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Синхронизация с MedIQ</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Передача данных о препаратах в MedIQ AI</div>
            </div>
            <Toggle on={mediq} onChange={v => { setMediq(v); setSyncStatus(null) }} />
          </div>

          {mediq && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* MedIQ endpoint */}
              <div>
                <label className="label">URL вашего MedIQ API</label>
                <input className="input" value={mediqUrl}
                  onChange={e => setMediqUrl(e.target.value)}
                  placeholder="https://mediq.yourapp.com/api/import" />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  Endpoint принимает POST-запрос с JSON данными о препаратах
                </div>
              </div>

              {/* What will be sent */}
              <div style={{ padding: '12px 14px', background: 'var(--primary-light)', borderRadius: 10, border: '1px solid var(--primary-border)' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--primary)', marginBottom: 6 }}>Будет передано в MedIQ:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: 12, color: '#1E40AF' }}>💊 Препараты: {items.filter(i=>i.type==='medication').length} назначений</div>
                  <div style={{ fontSize: 12, color: '#1E40AF' }}>🩺 Процедуры: {items.filter(i=>['procedure','exercise'].includes(i.type)).length} назначений</div>
                  <div style={{ fontSize: 12, color: '#1E40AF' }}>⚠️ Ограничения: {items.filter(i=>i.type==='restriction').length} пунктов</div>
                </div>
              </div>

              {/* Status */}
              {syncStatus === 'ok' && (
                <div style={{ padding: '10px 12px', background: 'var(--success-light)', border: '1px solid #A7F3D0', borderRadius: 9, fontSize: 13, color: 'var(--success)' }}>
                  ✅ {syncMsg}
                </div>
              )}
              {syncStatus === 'err' && (
                <div style={{ padding: '10px 12px', background: 'var(--danger-light)', border: '1px solid #FECACA', borderRadius: 9, fontSize: 13, color: 'var(--danger)', lineHeight: 1.5 }}>
                  ❌ {syncMsg}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={sendToMedIQ}
                  disabled={syncStatus === 'sending'}
                  style={{ flex: 2, padding: 11 }}>
                  {syncStatus === 'sending' ? '⏳ Отправка...' : '🔄 Синхронизировать'}
                </button>
                <button className="btn btn-ghost" onClick={copyPayload} style={{ flex: 1, padding: 11, fontSize: 12 }}>
                  {copied ? '✓ Скопировано' : '📋 Копировать JSON'}
                </button>
              </div>

              {profile?.mediq_last_sync && (
                <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                  Последняя синхронизация: {new Date(profile.mediq_last_sync).toLocaleString('ru')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>🔔 Уведомления</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Push-уведомления</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Напоминания о приёмах</div>
            </div>
            <Toggle on={notif} onChange={setNotif} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Повторить через (если не отмечено)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {[5,10,15,30,45,60,120].map(m => (
                <button key={m} onClick={() => setNd(m)} style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600,
                  background: nd === m ? 'var(--primary)' : 'var(--surface2)',
                  color: nd === m ? 'white' : 'var(--text3)', transition: 'all .12s'
                }}>{m} мин</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Режим тишины</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 6 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>С</label>
                <input type="time" className="input" value={qs} onChange={e => setQs(e.target.value)} />
              </div>
              <span style={{ color: 'var(--border2)', paddingBottom: 9, fontSize: 18 }}>—</span>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>До</label>
                <input type="time" className="input" value={qe} onChange={e => setQe(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Report */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>📋 Отчёт для врача</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
            Сформируйте PDF с историей соблюдения назначений для следующего визита.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ flex: 1, background: 'var(--success)', color: 'white', padding: 11 }}>📩 Скачать PDF</button>
            <button className="btn btn-ghost" style={{ flex: 1 }}>🔗 Поделиться ссылкой</button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', paddingBottom: 8 }}>
          MedSchedule v2.0 · Firebase + Gemini AI
        </p>
      </div>
    </div>
  )
}
