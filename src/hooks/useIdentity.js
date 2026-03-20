import { useState, useCallback } from 'react'
import { loadIdentity, saveIdentity, clearIdentity as clearStoredIdentity } from '../lib/storage.js'
import { generateId } from '../lib/ids.js'
import { callApi } from '../lib/api.js'

export function useIdentity() {
  const [identity, setIdentity] = useState(() => loadIdentity())

  const register = useCallback(async (displayName, passphrase) => {
    const playerId = identity?.playerId || generateId()
    const result = await callApi('registerPlayer', { playerId, displayName, passphrase })
    if (result && !result.ok) throw new Error(result.error || 'Registration failed')
    const newIdentity = { playerId, displayName }
    saveIdentity(newIdentity)
    return newIdentity
  }, [identity])

  const activate = useCallback((newIdentity) => {
    setIdentity(newIdentity)
  }, [])

  const rejoin = useCallback(async (playerId) => {
    const result = await callApi('registerPlayer', { playerId })
    if (result && !result.ok) throw new Error(result.error || 'Player not found')
    const newIdentity = { playerId, displayName: result.displayName || playerId }
    saveIdentity(newIdentity)
    setIdentity(newIdentity)
    return playerId
  }, [])

  const clearIdentity = useCallback(() => {
    clearStoredIdentity()
    setIdentity(null)
  }, [])

  return { identity, register, activate, rejoin, clearIdentity }
}
