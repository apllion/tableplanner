const EVENT_START = import.meta.env.VITE_EVENT_START || '2026-05-08'

const TOTAL_DAYS = 10

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const startDate = parseLocalDate(EVENT_START)

export function getDayDate(dayNumber) {
  const d = new Date(startDate)
  d.setDate(d.getDate() + dayNumber - 1)
  return d
}

export function getDayLabel(dayNumber) {
  const d = getDayDate(dayNumber)
  const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' })
  const day = d.getDate()
  const month = d.toLocaleDateString('de-DE', { month: 'short' })
  return `Tag ${dayNumber} \u2013 ${weekday}, ${day}. ${month}`
}

export function getTodayDayNumber() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const diff = Math.floor((today - start) / 86400000) + 1
  if (diff < 1) return 1
  if (diff > TOTAL_DAYS) return TOTAL_DAYS
  return diff
}

export { TOTAL_DAYS }
