import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useSchedule } from './hooks/useSchedule'
import Layout from './components/Layout'
import Auth from './screens/Auth'
import Dashboard from './screens/Dashboard'
import CalendarView from './screens/CalendarView'
import Upload from './screens/Upload'
import Notes from './screens/Notes'
import Profile from './screens/Profile'

function Inner() {
  const { user, loading } = useAuth()
  const [screen, setScreen] = useState('dashboard')
  const { items, add, toggle, remove, update } = useSchedule()

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '4px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
      <div style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>Загрузка...</div>
    </div>
  )

  if (!user) return <Auth />

  function addItems(arr) {
    arr.forEach(item => add(item))
    setScreen('dashboard')
  }

  const screenMap = {
    dashboard: <Dashboard items={items} toggle={toggle} add={add} remove={remove} update={update} />,
    calendar:  <CalendarView items={items} add={add} toggle={toggle} remove={remove} update={update} />,
    upload:    <Upload onAddItems={addItems} />,
    notes:     <Notes />,
    profile:   <Profile items={items} />,
  }

  return (
    <Layout active={screen} onChange={setScreen}>
      {screenMap[screen] || screenMap.dashboard}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}
