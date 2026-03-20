import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useSchedule } from './hooks/useSchedule'
import Layout from './components/Layout'
import Auth from './screens/Auth'
import Legal from './screens/Legal'
import Dashboard from './screens/Dashboard'
import CalendarView from './screens/CalendarView'
import Upload from './screens/Upload'
import Notes from './screens/Notes'
import Profile from './screens/Profile'
import ReportView from './screens/ReportView'

const WEEK_DATA = [
  {day:'Пн',pct:67},{day:'Вт',pct:100},{day:'Ср',pct:50},
  {day:'Чт',pct:83},{day:'Пт',pct:100},{day:'Сб',pct:33},{day:'Вс',pct:67}
]

function Inner() {
  const { user, loading, profile } = useAuth()
  const [screen, setScreen]       = useState('dashboard')
  const [legalDoc, setLegalDoc]   = useState(null)
  const [showReport, setShowReport] = useState(false)
  const { items, dbError, add, toggle, remove, update } = useSchedule()

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16 }}>
      <div style={{ width:48, height:48, border:'4px solid var(--primary-border)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin .9s linear infinite' }} />
      <div style={{ fontSize:14, color:'var(--text3)', fontWeight:500 }}>Загрузка...</div>
    </div>
  )

  if (legalDoc) return (
    <Legal doc={legalDoc} onBack={d => typeof d === 'string' ? setLegalDoc(d) : setLegalDoc(null)} />
  )

  if (!user) return <Auth onOpenLegal={d => setLegalDoc(d)} />

  if (showReport) return (
    <ReportView items={items} profile={profile} weekData={WEEK_DATA} onBack={() => setShowReport(false)} />
  )

  function addItems(arr) { arr.forEach(a => add(a)); setScreen('dashboard') }

  const screenMap = {
    dashboard: <Dashboard items={items} toggle={toggle} add={add} remove={remove} update={update} dbError={dbError} />,
    calendar:  <CalendarView items={items} add={add} toggle={toggle} remove={remove} update={update} />,
    upload:    <Upload onAddItems={addItems} />,
    notes:     <Notes />,
    profile:   <Profile items={items} onOpenReport={() => setShowReport(true)} />,
  }

  return (
    <Layout active={screen} onChange={setScreen}>
      {screenMap[screen] || screenMap.dashboard}
    </Layout>
  )
}

export default function App() {
  return <AuthProvider><Inner /></AuthProvider>
}
