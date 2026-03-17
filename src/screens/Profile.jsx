import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

const WEEK = [
  { day:'Пн',pct:67 },{ day:'Вт',pct:100 },{ day:'Ср',pct:50 },
  { day:'Чт',pct:83 },{ day:'Пт',pct:100 },{ day:'Сб',pct:33 },{ day:'Вс',pct:67 }
]

export default function Profile({ items }) {
  const { profile, updateProfile, logout } = useAuth()
  const [nd, setNd]     = useState(profile?.notify_delay || 30)
  const [qs, setQs]     = useState(profile?.quiet_start || '22:00')
  const [qe, setQe]     = useState(profile?.quiet_end   || '08:00')
  const [notif, setNotif] = useState(profile?.notifications !== false)
  const [mediq, setMediq] = useState(profile?.mediq_sync || false)
  const [saved, setSaved] = useState(false)

  const name = profile?.name || 'Пользователь'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  const avg = Math.round(WEEK.reduce((s,d) => s+d.pct, 0) / WEEK.length)
  const done = items.filter(i => i.done).length

  async function save() {
    await updateProfile({ notify_delay: nd, quiet_start: qs, quiet_end: qe, notifications: notif, mediq_sync: mediq })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function Toggle({ on, onChange }) {
    return (
      <button onClick={() => onChange(!on)} style={{
        width: 46, height: 26, borderRadius: 13, background: on ? 'var(--primary)' : 'var(--border2)',
        border: 'none', position: 'relative', transition: 'background .2s', flexShrink: 0
      }}>
        <div style={{ width: 19, height: 19, borderRadius: '50%', background: 'white', position: 'absolute', top: 3.5, left: on ? 23 : 4, transition: 'left .2s' }} />
      </button>
    )
  }

  function Row({ label, sub, right }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
        <div><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</div>{sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{sub}</div>}</div>
        {right}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h1 style={{ fontWeight: 700, fontSize: 18 }}>Профиль и настройки</h1>
        <button className="btn btn-primary" onClick={save} style={{ fontSize: 13, padding: '8px 16px' }}>
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* User card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: 'var(--primary)', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>{name}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>{profile?.email || ''}</div>
            </div>
            <button className="btn btn-ghost" onClick={logout} style={{ fontSize: 13 }}>Выйти ↩</button>
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
            {[['Сегодня', done + '/' + items.length, 'var(--primary)'],['Ср. неделя', avg+'%', avg>=80?'var(--success)':'var(--warning)'],['Активных', items.length+' задач', 'var(--purple)']].map(([l,v,c]) => (
              <div key={l} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly chart */}
        <div className="card" style={{ padding: '16px 14px' }}>
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

        {/* MedIQ Sync */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧬</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Синхронизация с MedIQ</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Передавать данные о препаратах в MedIQ AI</div>
            </div>
          </div>
          <Row label="Включить синхронизацию" sub="MedIQ будет учитывать ваши препараты при анализе" right={<Toggle on={mediq} onChange={setMediq} />} />
          {mediq && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--success-light)', border: '1px solid #A7F3D0', borderRadius: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--success)', marginBottom: 6 }}>Будет передано в MedIQ:</div>
              {['Текущие препараты и дозировки','Курс лечения и даты','Ограничения и противопоказания'].map(t => (
                <div key={t} style={{ fontSize: 12, color: '#065F46', marginBottom: 3 }}>✓ {t}</div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>🔔 Уведомления</div>
          <Row label="Push-уведомления" sub="Напоминания о приёмах" right={<Toggle on={notif} onChange={setNotif} />} />
          <div style={{ paddingTop: 14 }}>
            <label className="label">Повторить через (если не отмечено)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {[5,10,15,30,45,60,120].map(m => (
                <button key={m} onClick={() => setNd(m)} style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600,
                  background: nd===m ? 'var(--primary)' : 'var(--surface2)',
                  color: nd===m ? 'white' : 'var(--text3)', transition: 'all .12s'
                }}>{m} мин</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="label">Режим тишины</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>С</label>
                <input type="time" className="input" value={qs} onChange={e => setQs(e.target.value)} />
              </div>
              <span style={{ color: 'var(--border2)', marginTop: 18 }}>—</span>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>До</label>
                <input type="time" className="input" value={qe} onChange={e => setQe(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Report */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>📋 Отчёт для врача</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>Сформируйте PDF с историей соблюдения назначений для следующего визита.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ flex: 1, background: 'var(--success)', color: 'white', padding: '11px' }}>📩 Скачать PDF</button>
            <button className="btn btn-ghost" style={{ flex: 1 }}>🔗 Поделиться ссылкой</button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', paddingBottom: 8 }}>MedSchedule v2.0 · Supabase + Gemini AI</div>
      </div>
    </div>
  )
}
