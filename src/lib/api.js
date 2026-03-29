const API_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL || null)

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = '_jsonp_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    const cleanup = () => { delete window[cb]; script.remove() }
    const timer = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')) }, 30000)
    window[cb] = (data) => { clearTimeout(timer); cleanup(); resolve(data) }
    url.searchParams.set('callback', cb)
    script.src = url.toString()
    script.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error('JSONP error')) }
    document.head.appendChild(script)
  })
}

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

  let result
  try {
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    result = await res.json()
  } catch (err) {
    if (err instanceof TypeError) {
      result = await jsonp(url)
    } else {
      throw err
    }
  }

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
