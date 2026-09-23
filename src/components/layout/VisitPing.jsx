import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { USE_API, api } from '../../api/client'

const FLAG = 're-visit-pinged'

/**
 * Counts one real page-view per browser session (never per page — that would inflate every route
 * change into a "visit"). The server is the one that actually excludes the admin (belt & braces:
 * skipping here too means an admin's own testing never even reaches the endpoint). No UI, no
 * personal data leaves the browser beyond what every request already carries (IP, via the request
 * itself) — see docs/rules.md §15 for how this differs from the signed-in-only Event/interest history.
 */
export default function VisitPing() {
  const { user, ready } = useAuth()

  useEffect(() => {
    if (!USE_API || !ready || user?.role === 'admin') return
    try {
      if (sessionStorage.getItem(FLAG) === '1') return
      sessionStorage.setItem(FLAG, '1')
    } catch {
      /* storage blocked — ping anyway, worst case one extra row this session */
    }
    api('/visits/ping', { method: 'POST', body: { path: location.pathname }, keepalive: true }).catch(() => {})
  }, [ready, user])

  return null
}
