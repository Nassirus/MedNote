/**
 * googleCalendar.js — Google Calendar API integration for MedNOTE
 *
 * Setup required (one-time, in Google Cloud Console):
 * 1. Create project → Enable "Google Calendar API"
 * 2. OAuth 2.0 Client ID → Web application
 * 3. Authorized JS origins: https://med-note-dusky.vercel.app
 * 4. Authorized redirect URIs: same
 * 5. Add VITE_GOOGLE_CLIENT_ID to Vercel env vars
 *
 * Flow: user clicks "Connect Google Calendar" → Google OAuth popup →
 * access_token stored in localStorage → used for all API calls
 */

const CLIENT_ID    = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPE        = 'https://www.googleapis.com/auth/calendar.events'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const TOKEN_KEY    = 'gcal_token'
const TOKEN_EXP    = 'gcal_token_exp'

// ── Token management ──────────────────────────────────────────────────
export function getStoredToken() {
  const exp = parseInt(localStorage.getItem(TOKEN_EXP) || '0')
  if (Date.now() > exp) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXP)
    return null
  }
  return localStorage.getItem(TOKEN_KEY)
}

function saveToken(token, expiresIn) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_EXP, String(Date.now() + expiresIn * 1000))
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXP)
}

export function isConnected() {
  return !!getStoredToken()
}

// ── OAuth2 — opens Google login popup ────────────────────────────────
export function connectGoogleCalendar() {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID не настроен. Добавьте в Vercel Environment Variables.'))
      return
    }

    // Load Google Identity Services script
    if (!window.google?.accounts) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => doAuth(resolve, reject)
      script.onerror = () => reject(new Error('Не удалось загрузить Google Auth'))
      document.head.appendChild(script)
    } else {
      doAuth(resolve, reject)
    }
  })
}

function doAuth(resolve, reject) {
  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return }
        saveToken(resp.access_token, resp.expires_in || 3600)
        resolve(resp.access_token)
      },
    })
    tokenClient.requestAccessToken({ prompt: 'consent' })
  } catch (e) {
    reject(e)
  }
}

// ── Build Google Calendar event from MedNOTE item ────────────────────
function buildGCalEvent(item) {
  // Parse date: item.date (yyyy-MM-dd) or today for recurring
  const dateStr = item.date || (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  const [startH, startM] = (item.time || '08:00').split(':').map(Number)
  const [endH,   endM]   = (item.endTime || (() => {
    const em = startH * 60 + startM + 60
    return `${String(Math.floor(em/60)%24).padStart(2,'0')}:${String(em%60).padStart(2,'0')}`
  })()).split(':').map(Number)

  const startISO = `${dateStr}T${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`
  const endISO   = `${dateStr}T${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00`

  // Build description
  const typeLabels = {
    medication:  '💊 Лекарство',
    exercise:    '🏃 Упражнение',
    procedure:   '🩺 Процедура',
    appointment: '📅 Визит к врачу',
    restriction: '⚠️ Ограничение',
    nutrition:   '🥗 Питание',
    sleep:       '😴 Сон',
    routine:     '📋 Рутина',
  }
  const typeLabel = typeLabels[item.type] || '📋 Назначение'
  const desc = [
    typeLabel,
    item.notes ? `📝 ${item.notes}` : '',
    item.freq  ? `🔄 ${item.freq}`  : '',
    '',
    '— Добавлено через MedNOTE AI Medical Assistant',
  ].filter(Boolean).join('\n')

  // Recurrence rule for recurring items (no specific date)
  const recurrence = !item.date && item.freq ? buildRRule(item.freq) : null

  const event = {
    summary:     item.title,
    description: desc,
    start: { dateTime: startISO, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end:   { dateTime: endISO,   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    colorId: gcalColor(item.type),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
  }

  if (recurrence) event.recurrence = [recurrence]

  return event
}

function buildRRule(freq) {
  const map = {
    'Ежедневно':     'RRULE:FREQ=DAILY',
    'По будням':     'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    'По выходным':   'RRULE:FREQ=WEEKLY;BYDAY=SA,SU',
    'Раз в 2 дня':   'RRULE:FREQ=DAILY;INTERVAL=2',
    'Раз в неделю':  'RRULE:FREQ=WEEKLY',
    '2 раза в день': 'RRULE:FREQ=DAILY',
    '3 раза в день': 'RRULE:FREQ=DAILY',
  }
  return map[freq] || null
}

function gcalColor(type) {
  // Google Calendar color IDs: 1=lavender,2=sage,3=grape,4=flamingo,5=banana,6=tangerine,7=peacock,8=graphite,9=blueberry,10=basil,11=tomato
  const map = {
    medication:  '9',  // blueberry
    exercise:    '10', // basil (green)
    procedure:   '7',  // peacock (teal)
    appointment: '1',  // lavender
    restriction: '11', // tomato
    nutrition:   '5',  // banana
    sleep:       '8',  // graphite
    routine:     '7',  // peacock
  }
  return map[type] || '7'
}

// ── Create single event ───────────────────────────────────────────────
export async function addEventToGCal(item) {
  const token = getStoredToken()
  if (!token) throw new Error('NOT_CONNECTED')

  const event = buildGCalEvent(item)
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (res.status === 401) {
    clearToken()
    throw new Error('TOKEN_EXPIRED')
  }
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }
  return await res.json()
}

// ── Batch sync: add multiple items ───────────────────────────────────
export async function syncItemsToGCal(items) {
  const token = getStoredToken()
  if (!token) return { synced: 0, failed: 0, error: 'NOT_CONNECTED' }

  let synced = 0, failed = 0
  for (const item of items) {
    try {
      await addEventToGCal(item)
      synced++
      // Small delay to avoid rate limit (max 10 req/sec for Calendar API)
      await new Promise(r => setTimeout(r, 120))
    } catch {
      failed++
    }
  }
  return { synced, failed }
}

// ── Delete event from GCal ────────────────────────────────────────────
export async function deleteGCalEvent(gcalEventId) {
  const token = getStoredToken()
  if (!token) return
  await fetch(`${CALENDAR_API}/calendars/primary/events/${gcalEventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
}

// ── List upcoming MedNOTE events (to avoid duplicates) ────────────────
export async function listGCalMedNOTEEvents() {
  const token = getStoredToken()
  if (!token) return []
  const now = new Date().toISOString()
  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events?q=MedNOTE&timeMin=${now}&maxResults=100&singleEvents=true`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.items || []
}
