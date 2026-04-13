/**
 * useStreak.js — tracks consecutive days of full completion
 * Streak rules:
 *   - Increments if ALL today's items were marked done
 *   - Resets to 0 if user missed 2+ days
 *   - Freezes (no reset) if only 1 day missed — gives grace period
 */
import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'


// We import from notifications via relative path since hooks/ and lib/ are siblings
// Actually notifications.js is in lib/ — let's adjust:
import { notifyStreak as _notifyStreak, getStreakVisual as _gsv, getStreakMilestoneLabel as _gml } from '../lib/notifications'

export function useStreak(user, items) {
  const [streak, setStreak]   = useState(0)
  const [loading, setLoading] = useState(true)

  const today     = getTodayStr()
  const yesterday = getYesterdayStr()

  // Load streak from Firestore profile
  useEffect(() => {
    if (!user) { setLoading(false); return }
    loadStreak()
  }, [user])

  // Check and update streak whenever items change
  useEffect(() => {
    if (!user || loading) return
    checkAndUpdateStreak()
  }, [items, loading])

  async function loadStreak() {
    try {
      const snap = await getDoc(doc(db, 'profiles', user.uid))
      if (snap.exists()) {
        const data = snap.data()
        setStreak(data.streak_count || 0)
      }
    } catch (e) {
      console.warn('streak load error', e)
    }
    setLoading(false)
  }

  async function checkAndUpdateStreak() {
    if (!user) return

    // Get today's items
    const todayItems = items.filter(i => {
      if (i.date) return i.date === today
      return true  // recurring items always count
    })

    if (todayItems.length === 0) return  // nothing to track

    // Are all of today's items done?
    const allDone = todayItems.every(i => {
      if (i.date) return !!i.done
      return i.doneDate === today
    })

    try {
      const snap = await getDoc(doc(db, 'profiles', user.uid))
      if (!snap.exists()) return
      const data = snap.data()

      const currentStreak    = data.streak_count    || 0
      const lastStreakDate   = data.last_streak_date || null
      const lastCheckedDate  = data.streak_checked  || null

      // Already checked today
      if (lastCheckedDate === today) {
        setStreak(data.streak_count || 0)
        return
      }

      let newStreak = currentStreak

      if (allDone) {
        // Extend streak
        if (lastStreakDate === yesterday || lastStreakDate === today) {
          newStreak = currentStreak + 1
        } else if (!lastStreakDate) {
          newStreak = 1
        } else {
          // More than 1 day gap — check grace period
          const gapDays = daysBetween(lastStreakDate, today)
          if (gapDays <= 2) {
            // 1-day grace: freeze streak, don't reset
            newStreak = currentStreak
          } else {
            // Missed 2+ days — reset
            newStreak = 1
          }
        }

        const updates = {
          streak_count:     newStreak,
          last_streak_date: today,
          streak_checked:   today,
          streak_best:      Math.max(newStreak, data.streak_best || 0),
        }
        await updateDoc(doc(db, 'profiles', user.uid), updates)
        setStreak(newStreak)

        // Notify on milestones
        _notifyStreak(newStreak)

      } else {
        // Not all done today
        // Only reset if we missed yesterday AND today (2+ day gap)
        if (lastStreakDate && lastStreakDate !== yesterday && lastStreakDate !== today) {
          const gapDays = daysBetween(lastStreakDate, today)
          if (gapDays > 2) {
            await updateDoc(doc(db, 'profiles', user.uid), {
              streak_count:   0,
              streak_checked: today,
            })
            newStreak = 0
          }
        }
        setStreak(newStreak)
        await updateDoc(doc(db, 'profiles', user.uid), { streak_checked: today })
      }
    } catch (e) {
      console.warn('streak update error', e)
    }
  }

  const visual    = _gsv(streak)
  const milestone = _gml(streak)

  return { streak, visual, milestone, loading }
}

// ── Date helpers ───────────────────────────────────────────────────────
function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getYesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1)
  const d2 = new Date(dateStr2)
  return Math.abs(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)))
}
