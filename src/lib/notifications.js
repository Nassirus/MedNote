/**
 * notifications.js — Push notification logic for MedNOTE
 * Uses the Web Notifications API + Service Worker
 */

// ── Notification messages ─────────────────────────────────────────────
// Fun, caring, personalized messages in Russian

const REMINDER_MESSAGES = [
  { title: '⏰ Время принять лекарство!',      body: 'Не забудьте про "{title}" — ваш организм ждёт 💊' },
  { title: '💊 Напоминание от MedNOTE',         body: '"{title}" ещё не отмечен. Всё хорошо?' },
  { title: '🩺 Врач не забыл о вас',            body: 'И мы тоже! Пора принять "{title}" 😊' },
  { title: '⚡ Небольшое напоминание',           body: 'Кажется, вы пропустили "{title}". Ещё не поздно!' },
  { title: '🌟 Заботьтесь о себе!',              body: '"{title}" ждёт вас. Один маленький шаг к здоровью!' },
]

const LATE_MESSAGES = [
  { title: '😟 Вы кажется забыли отметиться',   body: '"{title}" не выполнен уже {minutes} минут. Всё в порядке?' },
  { title: '💙 MedNOTE беспокоится о вас',       body: 'Прошло {minutes} минут — "{title}" ещё не отмечен' },
  { title: '🔔 Напоминаем ещё раз',              body: '"{title}" — не пропускайте, врач назначил это не просто так!' },
]

const MORNING_MESSAGES = [
  { title: '🌅 Доброе утро!',                   body: 'Начните день правильно — у вас {count} назначений на сегодня' },
  { title: '☀️ Новый день — новый шанс',         body: 'Сегодня {count} пункт(а) в вашем плане лечения. Удачи!' },
]

const STREAK_MESSAGES = [
  { title: '🔥 Стрик {days} дней!',             body: 'Вы молодец! Уже {days} дней подряд без пропусков. Так держать!' },
  { title: '🏆 Вы на огне!',                     body: '{days} дней — это серьёзно. Ваш организм благодарит вас!' },
  { title: '⚡ Рекорд {days} дней!',              body: 'Продолжайте в том же духе — вы делаете это ради здоровья!' },
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// ── Service Worker registration ───────────────────────────────────────
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch (e) {
    console.warn('SW registration failed:', e)
    return null
  }
}

// ── Permission request ─────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

// ── Show a local notification ──────────────────────────────────────────
export async function showNotification(title, body, tag = 'mednote') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  // Use SW if available (better on mobile)
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready
    if (reg?.active) {
      reg.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag })
      return
    }
  }

  // Fallback to browser notification
  new Notification(title, {
    body,
    icon: '/icon-192.png',
    tag,
    silent: false,
  })
}

// ── Schedule item reminders ────────────────────────────────────────────
// Called from Dashboard — checks items every minute
export function buildReminderChecker(items, notifyDelayMinutes = 30) {
  return function checkReminders() {
    if (Notification.permission !== 'granted') return

    const now     = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const today   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

    // Quiet hours: don't notify 22:00-08:00
    if (now.getHours() >= 22 || now.getHours() < 8) return

    for (const item of items) {
      // Skip if already done today
      const isDone = item.date ? item.done : item.doneDate === today
      if (isDone) continue

      // Skip if no time set
      if (!item.time) continue

      // Check if item matches today
      const matchesDate = item.date
        ? item.date === today
        : true // recurring items always match

      if (!matchesDate) continue

      // Parse item time
      const [ih, im] = (item.time).split(':').map(Number)
      const itemMins = ih * 60 + im
      const elapsed  = nowMins - itemMins

      // Only fire between (delay) and (delay*3) minutes after scheduled time
      if (elapsed < notifyDelayMinutes) continue
      if (elapsed > notifyDelayMinutes * 3) continue

      // Don't spam: check if we notified in last 30 min
      const lastKey = `notified_${item.id}_${today}`
      const lastNotif = parseInt(localStorage.getItem(lastKey) || '0')
      if (nowMins - lastNotif < notifyDelayMinutes) continue

      // Pick message
      const template = elapsed > notifyDelayMinutes * 2
        ? pickRandom(LATE_MESSAGES)
        : pickRandom(REMINDER_MESSAGES)

      const title = fillTemplate(template.title, { title: item.title, minutes: elapsed })
      const body  = fillTemplate(template.body,  { title: item.title, minutes: elapsed })

      showNotification(title, body, `item-${item.id}`)
      localStorage.setItem(lastKey, String(nowMins))
    }
  }
}

// ── Morning summary notification ───────────────────────────────────────
export function scheduleMorningSummary(items) {
  if (Notification.permission !== 'granted') return

  const now   = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const lastKey = `morning_${today}`

  if (localStorage.getItem(lastKey)) return  // already sent today

  // Send between 8:00 and 8:15
  if (now.getHours() === 8 && now.getMinutes() < 15) {
    const count = items.filter(i => !i.date || i.date === today).length
    if (count > 0) {
      const msg = pickRandom(MORNING_MESSAGES)
      showNotification(
        fillTemplate(msg.title, { count }),
        fillTemplate(msg.body,  { count })
      )
      localStorage.setItem(lastKey, '1')
    }
  }
}

// ── Streak notification ────────────────────────────────────────────────
export function notifyStreak(streakDays) {
  if (Notification.permission !== 'granted') return
  if (![3, 7, 10, 14, 30, 50, 100, 200, 365].includes(streakDays)) return

  const msg = pickRandom(STREAK_MESSAGES)
  showNotification(
    fillTemplate(msg.title, { days: streakDays }),
    fillTemplate(msg.body,  { days: streakDays }),
    'streak'
  )
}

// ── Streak visual config ───────────────────────────────────────────────
export function getStreakVisual(days) {
  if (days <= 0)   return null
  if (days < 3)    return null  // streak starts showing at 3 days
  if (days < 10)   return { emoji: '🔥',              color: '#F97316', glow: '#FED7AA', label: `${days} дней`,  size: 'sm' }
  if (days < 50)   return { emoji: '🔥',              color: '#EF4444', glow: '#FECACA', label: `${days} дней`,  size: 'md' }
  if (days < 100)  return { emoji: '🔥✨',            color: '#DC2626', glow: '#FCA5A5', label: `${days} дней`,  size: 'md' }
  if (days < 200)  return { emoji: '💥🔥',            color: '#B91C1C', glow: '#FF6B6B', label: `${days} дней`,  size: 'lg' }
  if (days < 500)  return { emoji: '🌋🔥',            color: '#7C2D12', glow: '#FF4500', label: `${days} дней`,  size: 'xl' }
  return             { emoji: '⚡🔥💎',               color: '#1E1B4B', glow: '#818CF8', label: `${days} дней`,  size: 'xl' }
}

export function getStreakMilestoneLabel(days) {
  if (days >= 500)  return '💎 Легендарный'
  if (days >= 200)  return '🌋 Непобедимый'
  if (days >= 100)  return '🏆 Чемпион'
  if (days >= 50)   return '⭐ Мастер'
  if (days >= 10)   return '🥇 Профи'
  if (days >= 3)    return '🔥 Горячий'
  return null
}
