import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

export function useNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'notes'),
      where('user_id', '==', user.uid),
      orderBy('updated_at', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  async function create(title = 'Без названия', content = '') {
    if (!user) return null
    const ref = await addDoc(collection(db, 'notes'), {
      user_id: user.uid,
      title,
      content,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    const newNote = { id: ref.id, user_id: user.uid, title, content }
    setNotes(p => [newNote, ...p])
    return newNote
  }

  async function save(id, updates) {
    setNotes(p => p.map(n => n.id === id ? { ...n, ...updates } : n))
    if (user) await updateDoc(doc(db, 'notes', id), {
      ...updates,
      updated_at: serverTimestamp(),
    })
  }

  async function remove(id) {
    setNotes(p => p.filter(n => n.id !== id))
    if (user) await deleteDoc(doc(db, 'notes', id))
  }

  return { notes, create, save, remove }
}
