import { useState } from 'react'
import { DEMO_ITEMS, WEEK_DATA, MOOD_DATA } from './constants.js'
import Onboarding from './screens/Onboarding.jsx'
import Analyzing  from './screens/Analyzing.jsx'
import Preview    from './screens/Preview.jsx'
import Today      from './screens/Today.jsx'
import Week       from './screens/Week.jsx'
import Analytics  from './screens/Analytics.jsx'
import Report     from './screens/Report.jsx'
import Settings   from './screens/Settings.jsx'
import BottomNav  from './components/BottomNav.jsx'
import ItemModal  from './components/ItemModal.jsx'

const MAIN_SCREENS = ['today', 'week', 'analytics', 'settings']

export default function App() {
  const [screen, setScreen]   = useState('onboarding')
  const [items, setItems]     = useState(DEMO_ITEMS)
  const [docText, setDocText] = useState('')
  const [preview, setPreview] = useState([])
  const [selected, setSelected] = useState(null)
  // settings state
  const [notifyDelay, setNotifyDelay] = useState(30)
  const [quietStart, setQuietStart]   = useState('22:00')
  const [quietEnd, setQuietEnd]       = useState('08:00')
  const [notifOn, setNotifOn]         = useState(true)
  // add item
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ type: 'medication', title: '', time: '08:00', notes: '', freq: 'Ежедневно' })

  const toggleItem = (id) => setItems(p => p.map(i => i.id === id ? { ...i, done: !i.done } : i))
  const deleteItem = (id) => { setItems(p => p.filter(i => i.id !== id)); setSelected(null) }
  const addItem    = () => {
    if (!newItem.title.trim()) return
    setItems(p => [...p, { ...newItem, id: Date.now(), done: false }])
    setShowAdd(false)
    setNewItem({ type: 'medication', title: '', time: '08:00', notes: '', freq: 'Ежедневно' })
  }

  const handleAnalyze = async () => {
    if (!docText.trim()) return
    setScreen('analyzing')
    try {
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: docText })
      })
      const data = await res.json()
      const items = (data.items || []).map((x, i) => ({ ...x, id: Date.now() + i, done: false, sel: true }))
      setPreview(items.length ? items : DEMO_ITEMS.map(i => ({ ...i, sel: true })))
    } catch {
      setPreview(DEMO_ITEMS.map(i => ({ ...i, sel: true })))
    }
    setScreen('preview')
  }

  const handleConfirm = () => {
    const confirmed = preview.filter(i => i.sel).map(({ sel, ...rest }) => rest)
    setItems(confirmed.length ? confirmed : DEMO_ITEMS)
    setScreen('today')
  }

  const done = items.filter(i => i.done).length
  const pct  = items.length ? Math.round(done / items.length * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: '#F8FAFC' }}>

      {/* Status bar */}
      <div style={{
        padding: '10px 20px 0', flexShrink: 0,
        background: ['onboarding','analyzing'].includes(screen) ? '#0369A1' : 'white',
        display: 'flex', justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: ['onboarding','analyzing'].includes(screen) ? 'white' : '#0F172A' }}>9:41</span>
        <span style={{ fontSize: 12, color: ['onboarding','analyzing'].includes(screen) ? 'white' : '#0F172A' }}>⚡ 100%</span>
      </div>

      {/* Screen content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {screen === 'onboarding' && <Onboarding text={docText} setText={setDocText} onAnalyze={handleAnalyze} onSkip={() => setScreen('today')} />}
        {screen === 'analyzing'  && <Analyzing />}
        {screen === 'preview'    && <Preview items={preview} setItems={setPreview} onConfirm={handleConfirm} />}
        {screen === 'today'      && <Today items={items} toggle={toggleItem} pct={pct} done={done} onSelect={setSelected} showAdd={showAdd} setShowAdd={setShowAdd} newItem={newItem} setNewItem={setNewItem} onAdd={addItem} />}
        {screen === 'week'       && <Week items={items} weekData={WEEK_DATA} />}
        {screen === 'analytics'  && <Analytics weekData={WEEK_DATA} moodData={MOOD_DATA} items={items} onReport={() => setScreen('report')} />}
        {screen === 'report'     && <Report items={items} weekData={WEEK_DATA} onBack={() => setScreen('analytics')} />}
        {screen === 'settings'   && <Settings notifyDelay={notifyDelay} setNotifyDelay={setNotifyDelay} quietStart={quietStart} setQuietStart={setQuietStart} quietEnd={quietEnd} setQuietEnd={setQuietEnd} notifOn={notifOn} setNotifOn={setNotifOn} />}
      </div>

      {/* Item detail modal */}
      {selected && (
        <ItemModal
          item={selected}
          onClose={() => setSelected(null)}
          onDelete={deleteItem}
          onToggle={(id) => { toggleItem(id); setSelected(null) }}
        />
      )}

      {/* Bottom navigation */}
      {MAIN_SCREENS.includes(screen) && <BottomNav active={screen} onChange={setScreen} />}
    </div>
  )
}
