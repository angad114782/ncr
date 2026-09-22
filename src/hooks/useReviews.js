import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { USE_API, api } from '../api/client'

/**
 * Real, signed-in reviews for one agent or one property — admin-moderated before they go public (like
 * Testimonials). Not available in local-storage mode (no backend to moderate them against).
 *
 * `targetType`: 'agent' | 'property'. `targetId`: that agent's or property's id.
 */
export function useReviews(targetType, targetId) {
  const { user } = useAuth()
  const outlet = useOutletContext()
  const [state, setState] = useState({ loading: true, items: [], average: 0, total: 0, error: '' })
  const [mine, setMine] = useState(null) // this signed-in person's own review on this target, any status
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    if (!USE_API || !targetId) return
    api(`/reviews?targetType=${targetType}&targetId=${targetId}&limit=50`)
      .then((d) => setState({ loading: false, items: d.items, average: d.average, total: d.total, error: '' }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err.message })))
  }, [targetType, targetId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!USE_API || !user) { setMine(null); return }
    api('/me/reviews')
      .then((d) => setMine(d.items.find((r) => r.targetType === targetType && r.targetId === targetId) ?? null))
      .catch(() => {})
  }, [user, targetType, targetId])

  const send = async (authedUser, rating, text) => {
    setSubmitting(true)
    setNotice('')
    try {
      const { item } = await api('/me/reviews', { method: 'POST', body: { targetType, targetId, rating, text } })
      setMine(item)
      setNotice(item.status === 'approved' ? "Thanks — it's updated and live." : "Thanks — it's awaiting a quick check and will show here once approved.")
      load()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  /** Opens sign-in first (if needed) then submits — same one-flow pattern as useRevealPhone. */
  const submit = (rating, text) => {
    if (user) { send(user, rating, text); return }
    outlet?.openAuth?.('login', 'review', 'user', (authedUser) => send(authedUser, rating, text))
  }

  return { ...state, mine, submitting, notice, submit }
}
