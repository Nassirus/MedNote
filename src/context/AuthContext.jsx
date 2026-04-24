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
import { isAdmin, findClinic } from '../lib/roles'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await fetchProfile(u.uid, u.email)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsub
  }, [])

  async function fetchProfile(uid, email) {
    const snap = await getDoc(doc(db, 'profiles', uid))
    let data = snap.exists() ? { id: uid, ...snap.data() } : null

    // Auto-assign admin role
    if (data && isAdmin(email) && data.role !== 'admin') {
      await updateDoc(doc(db, 'profiles', uid), { role: 'admin' })
      data = { ...data, role: 'admin' }
    }

    setProfile(data)
    setLoading(false)
  }

  // Register patient (default role)
  async function register(email, password, name) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const role = isAdmin(email) ? 'admin' : 'patient'
    const profileData = {
      name,
      email: email.toLowerCase(),
      role,
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

  // Register doctor (with clinic partner ID)
  async function registerDoctor(email, password, name, partnerId, speciality) {
    const clinic = findClinic(partnerId)
    if (!clinic) throw new Error('Неверный ID клиники. Обратитесь к администратору.')

    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const profileData = {
      name,
      email: email.toLowerCase(),
      role: 'doctor',
      clinic_id:   clinic.id,
      clinic_name: clinic.name,
      speciality:  speciality || '',
      notify_delay: 30,
      quiet_start: '22:00',
      quiet_end: '08:00',
      notifications: true,
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

  const role = profile?.role || 'patient'
  const isDoctor = role === 'doctor' || role === 'admin'
  const isAdminUser = role === 'admin'

  return (
    <Ctx.Provider value={{
      user, profile, loading, role, isDoctor, isAdminUser,
      register, registerDoctor, login, logout, updateProfile
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
