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
import EventsManager from './screens/EventsManager'

function Inner() {
  const { user, loading } = useAuth()
  const [screen, setScreen]     = useState('dashboard')
  const [legalDoc, setLegalDoc] = useState(null)
  const [showEvents, setShowEvents] = useState(false)

  const { items, dbError, add, toggle, remove, removeGroup, removeDates, update } = useSchedule()

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

  if (showEvents) return (
    <EventsManager
      items={items}
      update={update}
      remove={remove}
      removeGroup={removeGroup}
      removeDates={removeDates}
      onBack={() => setShowEvents(false)}
    />
  )

  function addItems(arr) { arr.forEach(a => add(a)); setScreen('calendar') }

  const screenMap = {
    dashboard: <Dashboard items={items} toggle={toggle} add={add} remove={remove} update={update} dbError={dbError}
                  onOpenEvents={() => setShowEvents(true)} />,
    calendar:  <CalendarView items={items} add={add} toggle={toggle} remove={remove}
                  removeGroup={removeGroup} update={update} allItems={items} />,
    upload:    <Upload onAddItems={addItems} />,
    notes:     <Notes />,
    profile:   <Profile items={items} onOpenReport={() => {}} onOpenEvents={() => setShowEvents(true)} />,
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
