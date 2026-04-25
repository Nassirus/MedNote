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

  function renderTab() {
    switch (tab) {
      case 'patients': return <DoctorPatients/>
      case 'calendar': return <DoctorCalendar/>
      case 'profile':  return <DoctorProfile/>
      default:         return <DoctorPatients/>
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh',
      background:'var(--bg)', maxWidth:480, margin:'0 auto', position:'relative' }}>

      {/* Top bar */}
      <div style={{ background:'linear-gradient(135deg,#1E3A5F,#1D4ED8)',
        padding:'12px 18px', display:'flex', alignItems:'center',
        justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontWeight:600 }}>
            👨‍⚕️ ВРАЧЕБНЫЙ КАБИНЕТ
          </div>
          <div style={{ fontWeight:700, fontSize:15, color:'white', marginTop:1 }}>
            {profile?.name || 'Врач'}
          </div>
          {profile?.clinic_name && (
            <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', marginTop:1 }}>
              {profile.clinic_name}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:600 }}>
            {profile?.speciality || 'Специалист'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto' }}>
        <ErrorBoundary key={tab}>
          {renderTab()}
        </ErrorBoundary>
      </div>

      {/* Bottom nav */}
      <div style={{ display:'flex', background:'white',
        borderTop:'1px solid var(--border)', flexShrink:0,
        paddingBottom:'env(safe-area-inset-bottom)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'10px 0', background:'none', border:'none',
            cursor:'pointer', display:'flex', flexDirection:'column',
            alignItems:'center', gap:3,
            color: tab === t.id ? '#1D4ED8' : 'var(--text3)',
          }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight: tab===t.id ? 700 : 500 }}>{t.label}</span>
            {tab === t.id && (
              <div style={{ width:18, height:2, borderRadius:2, background:'#1D4ED8' }}/>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
