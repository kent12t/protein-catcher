import { useCallback } from 'react'
import { isLocalhost, RESULTS_ENDPOINT } from './offlineTracking'
import type { GameResult } from './offlineTracking'

export function useOfflineTracking() {
  return useCallback((result: GameResult) => {
    if (!isLocalhost(window.location.hostname)) return
    void fetch(RESULTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error(`Local tracking returned HTTP ${response.status}`)
    }).catch((error: unknown) => {
      console.error('Could not append game result to the local CSV:', error)
    })
  }, [])
}
