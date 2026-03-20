const API_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL || null)

export async function callApi(action, params = {}) {
  if (!API_URL) {
    const { mockCallApi } = await import('./mock-backend.js')
    return mockCallApi(action, params)
  }

  const url = new URL(API_URL, window.location.origin)
  url.searchParams.set('action', action)
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value))
  }

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const result = await res.json()

  // Normalize Sheets data
  if (result.ok && result.data?.games) {
    for (const g of result.data.games) {
      for (const k of ['minPlayers', 'maxPlayers', 'maxSeats', 'scheduledDay', 'endDay']) {
        if (g[k] !== '' && g[k] != null) g[k] = Number(g[k])
        else g[k] = null
      }
      // Sheets returns time cells as ISO dates like "1899-12-30T08:00:00.000Z"
      // Parse HH:MM directly from the string to avoid timezone shifts
      for (const k of ['scheduledTime', 'endTime']) {
        if (g[k] && String(g[k]).includes('T')) {
          const match = String(g[k]).match(/T(\d{2}):(\d{2})/)
          if (match) g[k] = `${match[1]}:${match[2]}`
        }
        if (g[k] === '') g[k] = null
      }
    }
  }

  return result
}
