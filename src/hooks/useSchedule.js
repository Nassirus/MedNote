import { useState, useEffect, useRef, useCallback } from 'react'
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

  // ── KEY FIX: useRef so the Set is always current inside onSnapshot closure ──
  // useState is async — inside onSnapshot callbacks it captures stale values.
  // useRef reads are always synchronous and return the live value.
  const deletingIds = useRef(new Set())

  useEffect(() => {
    if (!user) {
      setItems(DEMO_ITEMS)
      setLoading(false)
      return
    }

    let unsub

    function setupListener(withOrder) {
      const q = withOrder
        ? query(collection(db, 'schedule_items'), where('user_id', '==', user.uid), orderBy('time'))
        : query(collection(db, 'schedule_items'), where('user_id', '==', user.uid))

      return onSnapshot(q,
        snap => {
          // Always read deletingIds.current — never stale because it's a ref
          const deleting = deletingIds.current
          setItems(
            snap.docs
              .filter(d => !deleting.has(d.id))
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
          )
          setLoading(false)
          setDbError(null)
        },
        err => {
          if (withOrder && (err.code === 'failed-precondition' || err.message?.includes('index'))) {
            setDbError('index')
            unsub = setupListener(false) // retry without orderBy
          } else {
            setDbError(err.message)
            setLoading(false)
          }
        }
      )
    }

    unsub = setupListener(true)
    return () => unsub?.()
  }, [user])

  async function add(item) {
    const [h, m] = (item.time || '08:00').split(':').map(Number)
    const endMins = h * 60 + m + 60
    const endTime = item.endTime ||
      `${String(Math.floor(endMins / 60) % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`

    if (!user) {
      setItems(p => [...p, { ...item, endTime, id: String(Date.now()), done: false, doneDate: null }])
      return
    }
    try {
      await addDoc(collection(db, 'schedule_items'), {
        ...item,
        endTime,
        date:       item.date    || null,
        freq:       item.freq    || 'Ежедневно',
        done:       false,
        doneDate:   null,
        user_id:    user.uid,
        created_at: serverTimestamp(),
      })
    } catch (e) {
      console.error('add error:', e)
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
      catch { setItems(p => p.map(i => i.id === id ? { ...i, ...(item.date ? { done: wasDone } : { doneDate: item.doneDate, done: wasDone }) } : i)) }
    }
  }

  // ── REMOVE: mark in ref FIRST so onSnapshot never restores it ──
  async function remove(id) {
    deletingIds.current.add(id)                  // ref update: synchronous, immediate
    setItems(p => p.filter(i => i.id !== id))   // optimistic UI update

    if (!user) { deletingIds.current.delete(id); return }

    try {
      await deleteDoc(doc(db, 'schedule_items', id))
      // On success: Firestore sends snapshot without this doc.
      // deletingIds filter ensures it won't flash back even during the gap.
      // After a few seconds we can clean up the ref (doc is gone from server):
      setTimeout(() => deletingIds.current.delete(id), 5000)
    } catch (e) {
      console.error('DELETE FAILED — Firestore rules may be blocking:', e.code, e.message)
      // Rollback: remove from ref so snapshot can restore it
      deletingIds.current.delete(id)
      setDbError('Ошибка удаления: ' + (e.code || e.message))
    }
  }

  // ── REMOVE GROUP: all items with same title+type ──
  async function removeGroup(title, type) {
    const toDelete = items.filter(i => i.title === title && i.type === type)
    if (toDelete.length === 0) return

    toDelete.forEach(i => deletingIds.current.add(i.id))
    setItems(p => p.filter(i => !(i.title === title && i.type === type)))

    if (!user) return

    try {
      const CHUNK = 400
      for (let i = 0; i < toDelete.length; i += CHUNK) {
        const batch = writeBatch(db)
        toDelete.slice(i, i + CHUNK).forEach(item =>
          batch.delete(doc(db, 'schedule_items', item.id))
        )
        await batch.commit()
      }
      setTimeout(() => toDelete.forEach(i => deletingIds.current.delete(i.id)), 5000)
    } catch (e) {
      console.error('batch delete error:', e)
      toDelete.forEach(i => deletingIds.current.delete(i.id))
      setDbError('Ошибка удаления группы: ' + (e.code || e.message))
    }
  }

  // ── REMOVE specific dates ──
  async function removeDates(title, type, dateStrings) {
    const dateSet  = new Set(dateStrings)
    const toDelete = items.filter(i =>
      i.title === title && i.type === type && i.date && dateSet.has(i.date)
    )
    if (toDelete.length === 0) return

    toDelete.forEach(i => deletingIds.current.add(i.id))
    setItems(p => p.filter(i => !toDelete.find(d => d.id === i.id)))

    if (!user) return

    try {
      const batch = writeBatch(db)
      toDelete.forEach(item => batch.delete(doc(db, 'schedule_items', item.id)))
      await batch.commit()
      setTimeout(() => toDelete.forEach(i => deletingIds.current.delete(i.id)), 5000)
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
