import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { DEMO_ITEMS, TODAY_STR } from '../constants'
import { TODAY_STR as todayStr } from '../lib/dateUtils'

export function useSchedule() {
  const { user } = useAuth()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)

  useEffect(() => {
    if (!user) {
      setItems(DEMO_ITEMS)
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'schedule_items'),
      where('user_id', '==', user.uid),
      orderBy('time')
    )

    const unsub = onSnapshot(q,
      snap => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
        setDbError(null)
      },
      err => {
        console.error('Firestore error:', err.code, err.message)
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          setDbError('index')
          // Fallback without orderBy
          const q2 = query(collection(db,'schedule_items'), where('user_id','==',user.uid))
          const unsub2 = onSnapshot(q2, snap2 => {
            setItems(snap2.docs.map(d => ({id:d.id,...d.data()})).sort((a,b)=>(a.time||'').localeCompare(b.time||'')))
            setLoading(false)
          })
          return unsub2
        }
        setDbError(err.message)
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  async function add(item) {
    // Ensure endTime is stored (default +30min if not provided)
    const endTime = item.endTime || (() => {
      const [h, m] = (item.time || '08:00').split(':').map(Number)
      const total  = h * 60 + m + 30
      return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`
    })()

    if (!user) {
      setItems(p => [...p, { ...item, endTime, id: String(Date.now()), done: false, doneDate: null }])
      return
    }
    try {
      await addDoc(collection(db, 'schedule_items'), {
        ...item,
        endTime,
        date:     item.date     || null,
        done:     false,
        doneDate: null,
        user_id:  user.uid,
        created_at: serverTimestamp(),
      })
    } catch (e) {
      console.error('add error:', e)
      setItems(p => [...p, { ...item, endTime, id: String(Date.now()), done: false, doneDate: null }])
    }
  }

  async function toggle(id) {
    const item = items.find(i => i.id === id)
    if (!item) return

    // Per-day done logic:
    // - Recurring items (no date): track doneDate
    // - One-time items (with date): simple done boolean
    const today   = todayStr()
    const wasDone = item.date ? item.done : item.doneDate === today
    const updates = item.date
      ? { done: !wasDone }
      : { doneDate: wasDone ? null : today, done: !wasDone }

    setItems(p => p.map(i => i.id === id ? { ...i, ...updates } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), updates) }
      catch (e) {
        // Rollback
        const rollback = item.date
          ? { done: wasDone }
          : { doneDate: item.doneDate, done: wasDone }
        setItems(p => p.map(i => i.id === id ? { ...i, ...rollback } : i))
      }
    }
  }

  async function remove(id) {
    setItems(p => p.filter(i => i.id !== id))
    if (user) {
      try { await deleteDoc(doc(db, 'schedule_items', id)) }
      catch (e) { console.error('delete error:', e) }
    }
  }

  async function update(id, changes) {
    setItems(p => p.map(i => i.id === id ? { ...i, ...changes } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), changes) }
      catch (e) { console.error('update error:', e) }
    }
  }

  return { items, loading, dbError, add, toggle, remove, update }
}
