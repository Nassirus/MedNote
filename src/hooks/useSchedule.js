import { useState, useEffect, useCallback } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { DEMO_ITEMS } from '../constants'

export function useSchedule() {
  const { user } = useAuth()
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

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
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  async function add(item) {
    if (!user) {
      setItems(p => [...p, { ...item, id: Date.now(), done: false }])
      return
    }
    await addDoc(collection(db, 'schedule_items'), {
      ...item,
      user_id: user.uid,
      done: false,
      created_at: serverTimestamp(),
    })
  }

  async function toggle(id) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const done = !item.done
    setItems(p => p.map(i => i.id === id ? { ...i, done } : i))
    if (user) await updateDoc(doc(db, 'schedule_items', String(id)), { done })
  }

  async function remove(id) {
    setItems(p => p.filter(i => i.id !== id))
    if (user) await deleteDoc(doc(db, 'schedule_items', String(id)))
  }

  async function update(id, updates) {
    setItems(p => p.map(i => i.id === id ? { ...i, ...updates } : i))
    if (user) await updateDoc(doc(db, 'schedule_items', String(id)), updates)
  }

  return { items, loading, add, toggle, remove, update }
}
