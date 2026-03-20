const MINUTE = 60_000
const HOUR = 60 * MINUTE

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE)
    return `${mins}m ago`
  }
  const hours = Math.floor(diff / HOUR)
  return `${hours}h ago`
}

export function isAway(lastSeen, thresholdMs = 5 * MINUTE) {
  return Date.now() - new Date(lastSeen).getTime() > thresholdMs
}
