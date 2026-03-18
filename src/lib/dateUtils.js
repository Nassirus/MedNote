// Safe local-date parser — avoids UTC midnight timezone shift
// '2026-03-18' → new Date(2026, 2, 18)  (local midnight, no UTC offset)
export function parseDateStr(str) {
  if (!str) return null
  if (typeof str === 'string') {
    const parts = str.split('-').map(Number)
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2])
    // fallback for ISO strings with time component
    return new Date(str)
  }
  // Firestore Timestamp object
  if (str.seconds) return new Date(str.seconds * 1000)
  return new Date(str)
}

// Check if an item should appear on a given day
export function itemMatchesDay(item, day) {
  // Has specific date
  if (item.date) {
    const d = parseDateStr(item.date)
    if (!d) return false
    return d.getFullYear() === day.getFullYear() &&
           d.getMonth()    === day.getMonth()    &&
           d.getDate()     === day.getDate()
  }
  // Recurring — use frequency
  const dow = day.getDay() // 0=Sun
  switch (item.freq) {
    case 'Ежедневно':    return true
    case 'По будням':    return dow >= 1 && dow <= 5
    case 'По выходным':  return dow === 0 || dow === 6
    case 'Раз в неделю': return dow === 1
    case 'Раз в 2 дня': {
      const ref  = new Date(2024, 0, 1)
      const diff = Math.floor((day - ref) / 86400000)
      return diff % 2 === 0
    }
    case 'Разово': return false  // has no date → hide
    default:        return true   // unknown → show
  }
}

// Check if an item belongs to today
export function isItemToday(item) {
  const today = new Date()
  return itemMatchesDay(item, today)
}
