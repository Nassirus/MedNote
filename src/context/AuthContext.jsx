import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await fetchProfile(u.uid)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsub
  }, [])

  async function fetchProfile(uid) {
    const snap = await getDoc(doc(db, 'profiles', uid))
    setProfile(snap.exists() ? { id: uid, ...snap.data() } : null)
    setLoading(false)
  }

  async function register(email, password, name) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const profileData = {
      name,
      email,
      notify_delay: 30,
      quiet_start: '22:00',
      quiet_end: '08:00',
      notifications: true,
      mediq_sync: false,
      created_at: serverTimestamp(),
    }
    await setDoc(doc(db, 'profiles', cred.user.uid), profileData)
    setProfile({ id: cred.user.uid, ...profileData })
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
  }

  async function updateProfile(updates) {
    if (!user) return
    await updateDoc(doc(db, 'profiles', user.uid), updates)
    setProfile(p => ({ ...p, ...updates }))
  }

  return (
    <Ctx.Provider value={{ user, profile, loading, register, login, logout, updateProfile }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
