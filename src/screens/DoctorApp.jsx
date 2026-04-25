import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import DoctorPatients from './doctor/DoctorPatients'
import DoctorCalendar from './doctor/DoctorCalendar'
import DoctorProfile  from './doctor/DoctorProfile'

const TABS = [
  { id:'patients', icon:'👥', label:'Пациенты' },
  { id:'calendar', icon:'📅', label:'Приёмы' },
  { id:'profile',  icon:'👨‍⚕️', label:'Профиль' },
]

export default function DoctorApp() {
  const { profile, logout } = useAuth()
  const [tab, setTab] = useState('patients')
  const initials = (profile?.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  function renderTab() {
    switch (tab) {
      case 'patients': return <DoctorPatients/>
      case 'calendar': return <DoctorCalendar/>
      case 'profile':  return <DoctorProfile/>
      default:         return <DoctorPatients/>
    }
  }

  return (
    <>
      {/* App shell — same structure as patient Layout */}
      <div className="app-shell" style={{ borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)' }}>

        {/* ── Sidebar (desktop) ── */}
        <aside className="sidebar" style={{ background:'#0F172A' }}>
          {/* Logo */}
          <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid rgba(255,255,255,.1)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'#1D4ED8',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>👨‍⚕️</div>
              <div>
                <div style={{ fontWeight:800, fontSize:15, color:'white' }}>MedNOTE</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>Врачебный кабинет</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:'10px', display:'flex', flexDirection:'column', gap:2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                borderRadius:10, border:'none', width:'100%', textAlign:'left', cursor:'pointer',
                background: tab===t.id ? 'rgba(29,78,216,.4)' : 'transparent',
                color: tab===t.id ? '#93C5FD' : 'rgba(255,255,255,.55)',
                fontWeight: tab===t.id ? 700 : 400, fontSize:14,
              }}>
                <span style={{ fontSize:20 }}>{t.icon}</span>
                <span style={{ flex:1 }}>{t.label}</span>
                {tab===t.id && <div style={{ width:6, height:6, borderRadius:'50%', background:'#60A5FA' }}/>}
              </button>
            ))}
          </nav>

          {/* Doctor card */}
          <div style={{ padding:'14px 16px', borderTop:'1px solid rgba(255,255,255,.1)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10,
              padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,.07)' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'#1D4ED8',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:13, color:'white', flexShrink:0 }}>
                {initials}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'white',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {profile?.name||'Врач'}
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {profile?.speciality||'Специалист'}
                </div>
              </div>
              <button onClick={logout} title="Выйти"
                style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)',
                  fontSize:16, padding:4, cursor:'pointer' }}>↩</button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main-area">
          <ErrorBoundary key={tab}>
            {renderTab()}
          </ErrorBoundary>
        </div>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:3, background:'none', border:'none',
            padding:'6px 0', minHeight:52, cursor:'pointer',
            color: tab===t.id ? '#1D4ED8' : 'var(--text3)',
          }}>
            <span style={{ fontSize:22 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:tab===t.id?700:500 }}>{t.label}</span>
            {tab===t.id&&<div style={{ width:18, height:3, borderRadius:2, background:'#1D4ED8' }}/>}
          </button>
        ))}
      </nav>
    </>
  )
}
