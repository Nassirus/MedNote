import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { DEMO_ITEMS } from '../constants'

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

    // NOTE: Firestore requires a composite index:
    // Collection: schedule_items | Fields: user_id ASC, time ASC
    // Create it at: Firebase Console → Firestore → Indexes → Add index
    const q = query(
      collection(db, 'schedule_items'),
      where('user_id', '==', user.uid),
      orderBy('time')
    )

    const unsub = onSnapshot(
      q,
      snap => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
        setDbError(null)
      },
      err => {
        console.error('Firestore onSnapshot error:', err)
        // If index missing — fall back to unordered query
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          setDbError('index')
          // Fallback: query without orderBy
          const q2 = query(
            collection(db, 'schedule_items'),
            where('user_id', '==', user.uid)
          )
          const unsub2 = onSnapshot(q2, snap2 => {
            const sorted = snap2.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            setItems(sorted)
            setLoading(false)
          })
          return unsub2
        } else {
          setDbError(err.message)
          setLoading(false)
        }
      }
    )
    return unsub
  }, [user])

  async function add(item) {
    if (!user) {
      setItems(p => [...p, { ...item, id: String(Date.now()), done: false }])
      return
    }
    try {
      await addDoc(collection(db, 'schedule_items'), {
        ...item,
        date: item.date || null,
        user_id: user.uid,
        done: false,
        created_at: serverTimestamp(),
      })
    } catch (e) {
      console.error('add error:', e)
      // Show item optimistically even if Firestore fails
      setItems(p => [...p, { ...item, id: String(Date.now()), done: false }])
    }
  }

  async function toggle(id) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const done = !item.done
    setItems(p => p.map(i => i.id === id ? { ...i, done } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), { done }) }
      catch (e) { setItems(p => p.map(i => i.id === id ? { ...i, done: !done } : i)) }
    }
  }

  async function remove(id) {
    setItems(p => p.filter(i => i.id !== id))
    if (user) {
      try { await deleteDoc(doc(db, 'schedule_items', id)) }
      catch (e) { console.error('delete error:', e) }
    }
  }

  async function update(id, updates) {
    setItems(p => p.map(i => i.id === id ? { ...i, ...updates } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), updates) }
      catch (e) { console.error('update error:', e) }
    }
  }

  return { items, loading, dbError, add, toggle, remove, update }
}
