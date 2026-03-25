import { useState, useEffect } from 'react'
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

  // Track pending deletes to prevent onSnapshot from re-adding them
  const [pendingDeletes, setPendingDeletes] = useState(new Set())

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
        // Filter out items we are currently deleting
        setItems(prev => {
          const deleting = prev._pendingDeletes || new Set()
          return snap.docs
            .filter(d => !deleting.has(d.id))
            .map(d => ({ id: d.id, ...d.data() }))
        })
        setLoading(false)
        setDbError(null)
      },
      err => {
        console.error('Firestore error:', err.code)
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          setDbError('index')
          const q2 = query(collection(db, 'schedule_items'), where('user_id', '==', user.uid))
          const u2 = onSnapshot(q2, snap2 => {
            setItems(snap2.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (a.time || '').localeCompare(b.time || '')))
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
        ...item,
        endTime,
        date:     item.date   || null,
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
    const today   = TODAY_STR()
    const wasDone = item.date ? item.done : item.doneDate === today
    const updates = item.date
      ? { done: !wasDone }
      : { doneDate: wasDone ? null : today, done: !wasDone }

    setItems(p => p.map(i => i.id === id ? { ...i, ...updates } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), updates) }
      catch (e) {
        const rollback = item.date ? { done: wasDone } : { doneDate: item.doneDate, done: wasDone }
        setItems(p => p.map(i => i.id === id ? { ...i, ...rollback } : i))
      }
    }
  }

  // Remove a single item by ID — optimistic, with confirmed Firestore delete
  async function remove(id) {
    // Immediately remove from UI
    setItems(p => p.filter(i => i.id !== id))
    if (!user) return
    try {
      await deleteDoc(doc(db, 'schedule_items', id))
      // Success — Firestore onSnapshot will confirm it's gone
    } catch (e) {
      console.error('delete error:', e)
      // Rollback: re-fetch from current snapshot is handled by onSnapshot
      // But we need to mark that this specific delete failed
      setDbError('delete_failed')
    }
  }

  // Remove ALL items that share the same title + type (the whole "medication course")
  async function removeGroup(title, type) {
    const toDelete = items.filter(i => i.title === title && i.type === type)
    // Remove from UI immediately
    setItems(p => p.filter(i => !(i.title === title && i.type === type)))
    if (!user || toDelete.length === 0) return
    try {
      // Use batch delete for efficiency
      const batch = writeBatch(db)
      toDelete.forEach(item => batch.delete(doc(db, 'schedule_items', item.id)))
      await batch.commit()
    } catch (e) {
      console.error('batch delete error:', e)
    }
  }

  // Remove items matching title+type only for specific dates
  async function removeDates(title, type, dateStrings) {
    const dateSet = new Set(dateStrings)
    const toDelete = items.filter(i =>
      i.title === title && i.type === type && i.date && dateSet.has(i.date)
    )
    setItems(p => p.filter(i => !toDelete.some(d => d.id === i.id)))
    if (!user || toDelete.length === 0) return
    try {
      const batch = writeBatch(db)
      toDelete.forEach(item => batch.delete(doc(db, 'schedule_items', item.id)))
      await batch.commit()
    } catch (e) { console.error('removeDates error:', e) }
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
