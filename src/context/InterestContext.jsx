import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import usePersistedState from '../hooks/usePersistedState'
import { emptyProfile, recordEvent, summarise } from '../utils/interest'

const InterestContext = createContext(null)

/**
 * Remembers, on the visitor's own device, which homes / cities / budgets they looked at
 * (see utils/interest.js). First render = empty profile, so server-rendered HTML always matches.
 */
export function InterestProvider({ children }) {
  const [profile, setProfile, ready] = usePersistedState('re-interest', emptyProfile(), { merge: true })

  const track = useCallback((type, data) => setProfile((p) => recordEvent(p, type, data)), [setProfile])

  // Count one visit per browser session.
  useEffect(() => {
    if (!ready) return
    try {
      if (sessionStorage.getItem('re-visit-counted')) return
      sessionStorage.setItem('re-visit-counted', '1')
    } catch {
      /* storage blocked → skip counting */
    }
    track('visit')
  }, [ready, track])

  const summary = useMemo(() => summarise(profile), [profile])
  const clear = useCallback(() => setProfile(emptyProfile()), [setProfile])

  return <InterestContext.Provider value={{ profile, summary, track, clear, ready }}>{children}</InterestContext.Provider>
}

export function useInterest() {
  const ctx = useContext(InterestContext)
  if (!ctx) throw new Error('useInterest must be used within InterestProvider')
  return ctx
}
