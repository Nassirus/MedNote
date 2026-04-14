import { useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
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
import ReportView from './screens/ReportView'

function Inner() {
  const { user, loading, profile } = useAuth()
  const [screen, setScreen] = useState('dashboard')
  const [legalDoc, setLegalDoc] = useState(null)
  const [overlay, setOverlay] = useState(null) // 'events' | 'report'

  const { items, dbError, add, toggle, remove, removeGroup, removeDates, update } = useSchedule()

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16 }}>
      <div style={{ width:48, height:48, border:'4px solid var(--primary-border)',
        borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin .9s linear infinite' }}/>
      <div style={{ fontSize:14, color:'var(--text3)', fontWeight:500 }}>Загрузка...</div>
    </div>
  )

  if (legalDoc) return (
    <Legal doc={legalDoc} onBack={d => typeof d === 'string' ? setLegalDoc(d) : setLegalDoc(null)}/>
  )

  if (!user) return <Auth onOpenLegal={d => setLegalDoc(d)}/>

  if (overlay === 'events') return (
    <EventsManager
      items={items} update={update} remove={remove}
      removeGroup={removeGroup} removeDates={removeDates}
      onBack={() => setOverlay(null)}/>
  )

  if (overlay === 'report') return (
    <ReportView items={items} profile={profile} onBack={() => setOverlay(null)}/>
  )

  function addItems(arr) { arr.forEach(a => add(a)); setScreen('calendar') }

  // ── CRITICAL FIX: render only the ACTIVE screen, not all at once ──
  // A plain object `{ dashboard: <Comp/>, ... }` evaluates ALL JSX immediately.
  // If any screen crashes, the whole app gets a white screen.
  // Solution: use a function that returns JSX only for the current screen.
  function renderScreen() {
    switch (screen) {
      case 'dashboard':
        return <Dashboard
          items={items} toggle={toggle} add={add} remove={remove}
          update={update} dbError={dbError}
          onOpenEvents={() => setOverlay('events')}/>
      case 'calendar':
        return <CalendarView
          items={items} add={add} toggle={toggle} remove={remove}
          removeGroup={removeGroup} update={update} allItems={items}/>
      case 'upload':
        return <Upload onAddItems={addItems}/>
      case 'notes':
        return <Notes/>
      case 'profile':
        return <Profile
          items={items}
          onOpenReport={() => setOverlay('report')}
          onOpenEvents={() => setOverlay('events')}/>
      default:
        return <Dashboard
          items={items} toggle={toggle} add={add} remove={remove}
          update={update} dbError={dbError}
          onOpenEvents={() => setOverlay('events')}/>
    }
  }

  return (
    <Layout active={screen} onChange={setScreen}>
      <ErrorBoundary key={screen}>
        {renderScreen()}
      </ErrorBoundary>
    </Layout>
  )
}

export default function App() {
  return <AuthProvider><Inner/></AuthProvider>
}
