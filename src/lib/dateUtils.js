/**
 * dateUtils.js — central date/time utilities
 * All date-string parsing goes through here to avoid UTC timezone bugs.
 */

const TODAY_STR = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
}

/**
 * Parse 'yyyy-MM-dd' as LOCAL midnight (not UTC).
 * Firestore Timestamp objects are also handled.
 */
export function parseDateStr(str) {
  if (!str) return null
  if (typeof str === 'string') {
    const parts = str.split('-').map(Number)
    if (parts.length === 3 && !isNaN(parts[0])) {
      return new Date(parts[0], parts[1] - 1, parts[2])   // LOCAL midnight ✓
    }
    return new Date(str) // fallback for ISO datetime strings
  }
  if (str && typeof str === 'object' && str.seconds) {
    return new Date(str.seconds * 1000) // Firestore Timestamp
  }
  return new Date(str)
}

/**
 * Compare two dates by calendar day (ignores time).
 */
export function isSameDayLocal(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

/**
 * Does this item appear on calendar day `d`?
 */
export function itemMatchesDay(item, d) {
  if (item.date) {
    const itemDate = parseDateStr(item.date)
    return itemDate ? isSameDayLocal(itemDate, d) : false
  }
  const dow = d.getDay() // 0=Sun
  switch (item.freq) {
    case 'Ежедневно':    return true
    case 'По будням':    return dow >= 1 && dow <= 5
    case 'По выходным':  return dow === 0 || dow === 6
    case 'Раз в неделю': return dow === 1
    case 'Раз в 2 дня':  {
      const diff = Math.floor((d - new Date(2024, 0, 1)) / 86400000)
      return diff % 2 === 0
    }
    case 'Разово': return false
    default:        return false  // unknown/missing freq → don't show
  }
}

/**
 * Is this item "done" for TODAY specifically?
 * Recurring items use doneDate field (per-day tracking).
 * One-time items use the simple done boolean.
 */
export function isDoneToday(item) {
  if (item.date) {
    // One-time item: done is permanent
    return !!item.done
  }
  // Recurring item: done only if doneDate === today
  return item.doneDate === TODAY_STR()
}

export { TODAY_STR }

/**
 * Is this item visible on today's dashboard?
 */
export function isItemToday(item) {
  return itemMatchesDay(item, new Date())
}

/**
 * Convert 'HH:MM' to minutes since midnight
 */
export function timeToMins(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Convert minutes to 'HH:MM'
 */
export function minsToTime(mins) {
  const clamped = Math.max(0, Math.min(23*60+59, mins))
  return `${String(Math.floor(clamped/60)).padStart(2,'0')}:${String(clamped%60).padStart(2,'0')}`
}

/**
 * Get item duration in minutes (defaults to 30 if no endTime)
 */
export function itemDuration(item) {
  if (!item.endTime) return 30
  const start = timeToMins(item.time)
  const end   = timeToMins(item.endTime)
  const dur   = end - start
  return dur > 0 ? dur : 30
}

/**
 * Detect overlapping items and assign column layout.
 * Returns array of { item, colIdx, colCount } for side-by-side rendering.
 */
export function layoutItems(items) {
  if (!items.length) return []

  // Sort by start time
  const sorted = [...items].sort((a, b) => timeToMins(a.time) - timeToMins(b.time))

  const result = sorted.map(item => ({
    item,
    start: timeToMins(item.time),
    end:   timeToMins(item.time) + itemDuration(item),
    colIdx: 0,
    colCount: 1,
  }))

  // Group overlapping items
  const groups = []
  for (const ev of result) {
    let placed = false
    for (const group of groups) {
      // Check if this event overlaps any event in the group
      const overlaps = group.some(g => ev.start < g.end && ev.end > g.start)
      if (overlaps) {
        group.push(ev)
        placed = true
        break
      }
    }
    if (!placed) groups.push([ev])
  }

  // Assign colIdx and colCount within each group
  for (const group of groups) {
    const n = group.length
    // Build columns greedily
    const cols = [[]]
    for (const ev of group) {
      let placed = false
      for (let ci = 0; ci < cols.length; ci++) {
        const col = cols[ci]
        const last = col[col.length - 1]
        if (!last || ev.start >= last.end) {
          col.push(ev)
          ev.colIdx   = ci
          ev.colCount = n
          placed = true
          break
        }
      }
      if (!placed) {
        ev.colIdx   = cols.length
        ev.colCount = n
        cols.push([ev])
      }
    }
    // Update colCount to actual number of columns used
    const actualCols = cols.length
    group.forEach(ev => { ev.colCount = actualCols })
  }

  return result
}

/**
 * Can the user mark this item as done?
 * Returns false if the item's date is in the future.
 */
/**
 * canToggleItem — controls when a user can mark an item done/undone
 *
 * Rules:
 * - Can mark done starting 30 min BEFORE the scheduled time
 * - Can mark done until end of the same calendar day (23:59)
 * - Cannot mark done for PAST days (yesterday and earlier)
 * - Cannot mark done for FUTURE days (tomorrow and later)
 * - Recurring items (no date) follow the same time window rule
 */
export function canToggleItem(item) {
  const now     = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

  // Parse item's scheduled time → minutes since midnight
  const [ih, im] = (item.time || '00:00').split(':').map(Number)
  const itemMins = ih * 60 + im

  // Window: 30 min before the event time until end of day (1439 = 23:59)
  const windowStart = itemMins - 30
  const windowEnd   = 23 * 60 + 59   // end of day

  // --- Date-based items (courses, one-time) ---
  if (item.date) {
    const todayStr = (() => {
      const t = new Date()
      return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
    })()

    // Past days → never
    if (item.date < todayStr) return false
    // Future days → never
    if (item.date > todayStr) return false
    // Today → check time window
    return nowMins >= windowStart
  }

  // --- Recurring items (no date) ---
  // Always today — check time window only
  return nowMins >= windowStart
}

/**
 * toggleStatus — returns a status string for UI display
 * 'done'      — already marked done
 * 'available' — can mark now (within window)
 * 'too_early' — not yet 30 min before event
 * 'past_day'  — yesterday or earlier, locked
 * 'future'    — future date, locked
 */
export function getToggleStatus(item) {
  const isDone = isDoneToday(item)
  if (isDone) return 'done'

  const now     = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const [ih, im] = (item.time || '00:00').split(':').map(Number)
  const itemMins = ih * 60 + im
  const minsUntil = itemMins - nowMins  // positive = event is in future

  if (item.date) {
    const todayStr = (() => {
      const t = new Date()
      return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
    })()
    if (item.date < todayStr) return 'past_day'
    if (item.date > todayStr) return 'future'
  }

  if (minsUntil > 30) return 'too_early'   // more than 30 min until event
  return 'available'
}
