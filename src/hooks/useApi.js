import { useCallback } from 'react'
import { callApi } from '../lib/api.js'

export function useApi(refresh) {
  const call = useCallback(async (action, params = {}) => {
    const result = await callApi(action, params)
    if (result.ok) {
      await refresh()
    }
    return result
  }, [refresh])

  return { call }
}
