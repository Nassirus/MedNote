import { useState, useEffect, useRef } from 'react'
// Google Calendar: loaded dynamically to avoid import errors if not configured
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { DEMO_ITEMS } from '../constants'
import { TODAY_STR } from '../lib/dateUtils'

// ── Safe doc-id extractor ─────────────────────────────────────────────
// Firestore snapshot: doc.id is always a valid string.
// doc.data() may contain a stale numeric 'id' field from old buggy code.
// We always use d.id (Firestore), never d.data().id.
function docToItem(d) {
  const data = d.data()
  // Explicitly exclude any 'id' field stored inside the document
  // eslint-disable-next-line no-unused-vars
  const { id: _discard, ...rest } = data
  return { id: d.id, ...rest }   // d.id is always a valid Firestore string
}

export function useSchedule() {
  const { user } = useAuth()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)

  const deletingIds = useRef(new Set())   // must be useRef — see note in remove()

  useEffect(() => {
    if (!user) { setItems(DEMO_ITEMS); setLoading(false); return }

    let unsub

    function listen(ordered) {
      const q = ordered
        ? query(collection(db, 'schedule_items'), where('user_id', '==', user.uid), orderBy('time'))
        : query(collection(db, 'schedule_items'), where('user_id', '==', user.uid))

      return onSnapshot(q,
        snap => {
          const del = deletingIds.current
          setItems(
            snap.docs
              .filter(d => !del.has(d.id))
              .map(docToItem)
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
          )
          setLoading(false)
          setDbError(null)
        },
        err => {
          if (ordered && (err.code === 'failed-precondition' || err.message?.includes('index'))) {
            setDbError('index')
            unsub = listen(false)
          } else {
            console.error('onSnapshot error', err)
            setDbError(err.message)
            setLoading(false)
          }
        }
      )
    }

    unsub = listen(true)
    return () => unsub?.()
  }, [user])

  // ── ADD ──────────────────────────────────────────────────────────────
  async function add(item) {
    const [h, m] = (item.time || '08:00').split(':').map(Number)
    const em  = h * 60 + m + 60
    const end = item.endTime || `${String(Math.floor(em/60)%24).padStart(2,'0')}:${String(em%60).padStart(2,'0')}`

    if (!user) {
      setItems(p => [...p, { ...item, endTime: end, id: String(Date.now()), done: false, doneDate: null }])
      return
    }

    // Strip 'id' — Firestore auto-generates it.
    // A numeric id from Preview would corrupt the document and break future deletes.
    // eslint-disable-next-line no-unused-vars
    const { id: _drop, ...clean } = item
    try {
      await addDoc(collection(db, 'schedule_items'), {
        ...clean,
        endTime:    end,
        date:       item.date  || null,
        freq:       item.freq  || 'Ежедневно',
        done:       false,
        doneDate:   null,
        user_id:    user.uid,
        created_at: serverTimestamp(),
      })
      // Auto-sync to Google Calendar if connected (dynamic import = safe)
      try {
        const gcal = await import('../lib/googleCalendar')
        if (gcal.getStoredToken()) {
          gcal.addEventToGCal({ ...clean, endTime: end }).catch(() => {})
        }
      } catch { /* gcal not available */ }
    } catch (e) { console.error('add error', e) }
  }

  // ── TOGGLE ───────────────────────────────────────────────────────────
  async function toggle(id) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const today   = TODAY_STR()
    const wasDone = item.date ? item.done : item.doneDate === today
    const upd     = item.date
      ? { done: !wasDone }
      : { doneDate: wasDone ? null : today, done: !wasDone }
    setItems(p => p.map(i => i.id === id ? { ...i, ...upd } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), upd) }
      catch { setItems(p => p.map(i => i.id === id ? { ...i, ...( item.date ? { done: wasDone } : { doneDate: item.doneDate, done: wasDone }) } : i)) }
    }
  }

  // ── REMOVE ───────────────────────────────────────────────────────────
  // CRITICAL: deletingIds must be useRef, not useState.
  // onSnapshot callbacks close over the ref but NOT over state — state would
  // always appear as the initial empty Set inside the closure.
  async function remove(id) {
    // Guard: Firestore doc() requires a non-empty string
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('remove() called with invalid id:', id, typeof id)
      return
    }

    deletingIds.current.add(id)
    setItems(p => p.filter(i => i.id !== id))

    if (!user) { deletingIds.current.delete(id); return }

    try {
      await deleteDoc(doc(db, 'schedule_items', id))
      setTimeout(() => deletingIds.current.delete(id), 5000)
    } catch (e) {
      console.error('DELETE FAILED:', e.code, e.message)
      deletingIds.current.delete(id)
      setDbError(e.code === 'permission-denied'
        ? 'Нет прав удаления. Обнови правила в Firebase Console → Firestore → Rules'
        : 'Ошибка удаления: ' + (e.message || e.code || String(e)))
    }
  }

  // ── REMOVE GROUP ─────────────────────────────────────────────────────
  async function removeGroup(title, type) {
    const toDelete = items.filter(i => i.title === title && i.type === type)
    if (!toDelete.length) return
    toDelete.forEach(i => deletingIds.current.add(i.id))
    setItems(p => p.filter(i => !(i.title === title && i.type === type)))
    if (!user) return
    try {
      for (let i = 0; i < toDelete.length; i += 400) {
        const batch = writeBatch(db)
        toDelete.slice(i, i + 400).forEach(x => batch.delete(doc(db, 'schedule_items', x.id)))
        await batch.commit()
      }
      setTimeout(() => toDelete.forEach(i => deletingIds.current.delete(i.id)), 5000)
    } catch (e) {
      console.error('removeGroup error', e)
      toDelete.forEach(i => deletingIds.current.delete(i.id))
    }
  }

  // ── REMOVE DATES ─────────────────────────────────────────────────────
  async function removeDates(title, type, dateStrings) {
    const ds       = new Set(dateStrings)
    const toDelete = items.filter(i => i.title === title && i.type === type && i.date && ds.has(i.date))
    if (!toDelete.length) return
    toDelete.forEach(i => deletingIds.current.add(i.id))
    setItems(p => p.filter(i => !toDelete.find(d => d.id === i.id)))
    if (!user) return
    try {
      const batch = writeBatch(db)
      toDelete.forEach(x => batch.delete(doc(db, 'schedule_items', x.id)))
      await batch.commit()
      setTimeout(() => toDelete.forEach(i => deletingIds.current.delete(i.id)), 5000)
    } catch (e) {
      console.error('removeDates error', e)
      toDelete.forEach(i => deletingIds.current.delete(i.id))
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────
  async function update(id, changes) {
    setItems(p => p.map(i => i.id === id ? { ...i, ...changes } : i))
    if (user) {
      try { await updateDoc(doc(db, 'schedule_items', id), changes) }
      catch (e) { console.error('update error', e) }
    }
  }

  return { items, loading, dbError, add, toggle, remove, removeGroup, removeDates, update }
}
