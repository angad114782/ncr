import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import usePersistedState from '../hooks/usePersistedState'
import { emptyProfile, recordEvent, summarise } from '../utils/interest'
import { USE_API, api } from '../api/client'
import { useAuth } from './AuthContext'

const InterestContext = createContext(null)

/** Only plain, non-identifying facts about a home / search go to the server (never the whole listing). */
function slim(type, data = {}) {
  const keys = type === 'search' ? ['purpose', 'city', 'type', 'beds', 'maxPrice', 'q'] : ['id', 'city', 'type', 'beds', 'purpose', 'price']
  return Object.fromEntries(keys.filter((k) => ['string', 'number', 'boolean'].includes(typeof data[k])).map((k) => [k, data[k]]))
}

/**
 * Remembers, on the visitor's own device, which homes / cities / budgets they looked at
 * (see utils/interest.js). First render = empty profile, so server-rendered HTML always matches.
 *
 * With the backend, a signed-in CLIENT (who accepted the consent text at sign-up) also has these events sent to
 * their account, in small batches, so the team has their history before the first call. Erased with the account.
 */
export function InterestProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfile, ready] = usePersistedState('re-interest', emptyProfile(), { merge: true })

  const roleRef = useRef(user?.role)
  roleRef.current = user?.role
  const queue = useRef([])
  const timer = useRef(null)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const events = queue.current.splice(0, 100)
    if (events.length) api('/me/events', { method: 'POST', body: { events }, keepalive: true }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!USE_API) return undefined
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [flush])

  const track = useCallback(
    (type, data) => {
      setProfile((p) => recordEvent(p, type, data))
      if (USE_API && roleRef.current === 'user') {
        queue.current.push({ type, data: slim(type, data), at: Date.now() })
        clearTimeout(timer.current)
        timer.current = setTimeout(flush, 5000)
      }
    },
    [setProfile, flush],
  )

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
