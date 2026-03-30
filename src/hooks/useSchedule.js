import { useState, useEffect, useRef } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { DEMO_ITEMS } from '../constants'
import { TODAY_STR } from '../lib/dateUtils'

export function useSchedule() {
  const { user } = useAuth()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)

  // useRef — читается синхронно внутри onSnapshot callback
  // State обновляется асинхронно, поэтому useRef здесь обязателен
  const deletingIds = useRef(new Set())

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
        // Exclude IDs that we just deleted (ref is always current)
        const stillDeleting = deletingIds.current
        const newItems = snap.docs
          .filter(d => !stillDeleting.has(d.id))
          .map(d => ({ id: d.id, ...d.data() }))
        setItems(newItems)
        setLoading(false)
        setDbError(null)
      },
      err => {
        console.error('Firestore error:', err.code)
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          setDbError('index')
          const q2 = query(collection(db, 'schedule_items'), where('user_id', '==', user.uid))
          const u2 = onSnapshot(q2, snap2 => {
            const stillDeleting = deletingIds.current
            setItems(
              snap2.docs
                .filter(d => !stillDeleting.has(d.id))
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            )
            setLoading(false)
          })
          return u2
        }
        setDbError(err.message)
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  async function add(item) {
    const endTime = item.endTime || (() => {
      const [h, m] = (item.time || '08:00').split(':').map(Number)
      const t = h * 60 + m + 30
      return `${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`
    })()
    if (!user) {
      setItems(p => [...p, { ...item, endTime, id: String(Date.now()), done: false, doneDate: null }])
      return
    }
    try {
      await addDoc(collection(db, 'schedule_items'), {
        ...item, endTime,
        date: item.date || null,
        done: false, doneDate: null,
        user_id: user.uid,
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
    const today   = TODAY_STR()
    const wasDone = item.date ? item.done : item.doneDate === today
    const updates = item.date
      ? { done: !wasDone }
      : { doneDate: wasDone ? null : today, done: !wasDone }
    setItems(p => p.map(i => i.id === id ? { ...i, ...updates } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), updates) }
      catch (e) {
        const rb = item.date ? { done: wasDone } : { doneDate: item.doneDate, done: wasDone }
        setItems(p => p.map(i => i.id === id ? { ...i, ...rb } : i))
      }
    }
  }

  async function remove(id) {
    // 1. Mark as deleting in ref BEFORE touching state
    deletingIds.current.add(id)
    // 2. Remove from UI
    setItems(p => p.filter(i => i.id !== id))
    if (!user) { deletingIds.current.delete(id); return }
    try {
      await deleteDoc(doc(db, 'schedule_items', id))
      // Success — keep in deletingIds until next snapshot confirms removal
      // onSnapshot will fire without this id since Firestore deleted it
    } catch (e) {
      console.error('delete error:', e)
      // Rollback: remove from deleting so snapshot can restore it
      deletingIds.current.delete(id)
      // Re-fetch by triggering a re-read
      setDbError('delete_failed')
    }
  }

  async function removeGroup(title, type) {
    const toDelete = items.filter(i => i.title === title && i.type === type)
    // Mark all as deleting
    toDelete.forEach(i => deletingIds.current.add(i.id))
    setItems(p => p.filter(i => !(i.title === title && i.type === type)))
    if (!user || toDelete.length === 0) return
    try {
      // Firestore batch limit is 500 — chunk if needed
      const chunks = []
      for (let i = 0; i < toDelete.length; i += 400) chunks.push(toDelete.slice(i, i + 400))
      for (const chunk of chunks) {
        const batch = writeBatch(db)
        chunk.forEach(item => batch.delete(doc(db, 'schedule_items', item.id)))
        await batch.commit()
      }
    } catch (e) {
      console.error('batch delete error:', e)
      toDelete.forEach(i => deletingIds.current.delete(i.id))
    }
  }

  async function removeDates(title, type, dateStrings) {
    const dateSet  = new Set(dateStrings)
    const toDelete = items.filter(i =>
      i.title === title && i.type === type && i.date && dateSet.has(i.date)
    )
    toDelete.forEach(i => deletingIds.current.add(i.id))
    setItems(p => p.filter(i => !toDelete.some(d => d.id === i.id)))
    if (!user || toDelete.length === 0) return
    try {
      const batch = writeBatch(db)
      toDelete.forEach(item => batch.delete(doc(db, 'schedule_items', item.id)))
      await batch.commit()
    } catch (e) {
      console.error('removeDates error:', e)
      toDelete.forEach(i => deletingIds.current.delete(i.id))
    }
  }

  async function update(id, changes) {
    setItems(p => p.map(i => i.id === id ? { ...i, ...changes } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), changes) }
      catch (e) { console.error('update error:', e) }
    }
  }

  return { items, loading, dbError, add, toggle, remove, removeGroup, removeDates, update }
}
