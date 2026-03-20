import { useState, useEffect, useCallback, useRef } from 'react'
import { callApi } from '../lib/api.js'

const POLL_VISIBLE = 3_000
const POLL_HIDDEN = 15_000
const HEARTBEAT_INTERVAL = 30_000

export function useEventData(identity) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const refreshRef = useRef(null)

  const refresh = useCallback(async () => {
    try {
      const result = await callApi('poll')
      if (result.ok) {
        setData(result.data)
        setError(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  refreshRef.current = refresh

  // Polling
  useEffect(() => {
    if (!identity) return

    refresh()

    let timerId
    function schedule() {
      const interval = document.hidden ? POLL_HIDDEN : POLL_VISIBLE
      timerId = setTimeout(async () => {
        await refreshRef.current()
        schedule()
      }, interval)
    }
    schedule()

    function onVisibility() {
      clearTimeout(timerId)
      schedule()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimeout(timerId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [identity, refresh])

  // Heartbeat
  useEffect(() => {
    if (!identity) return

    const id = setInterval(() => {
      callApi('heartbeat', { playerId: identity.playerId })
    }, HEARTBEAT_INTERVAL)

    return () => clearInterval(id)
  }, [identity])

  return { data, loading, error, refresh }
}
