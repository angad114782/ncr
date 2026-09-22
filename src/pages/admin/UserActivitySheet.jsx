import { useEffect, useState } from 'react'
import { Eye, Globe, GitCompare, Heart, MapPin, Search } from 'lucide-react'
import GlassSheet from '../../components/glass/GlassSheet'
import GlassButton from '../../components/glass/GlassButton'
import { api } from '../../api/client'

const TYPE = {
  view: { icon: Eye, label: 'Viewed a property' },
  search: { icon: Search, label: 'Searched' },
  save: { icon: Heart, label: 'Saved a property' },
  compare: { icon: GitCompare, label: 'Compared a property' },
  visit: { icon: Globe, label: 'Visited the site' },
}

/** One line describing what happened, from the plain facts InterestContext sends (never the whole listing). */
function summarise(e) {
  const d = e.data ?? {}
  if (e.type === 'search') {
    const bits = [d.purpose, d.beds && `${d.beds} BHK`, d.type, d.city && `in ${d.city}`, d.maxPrice && `under ₹${Number(d.maxPrice).toLocaleString('en-IN')}`, d.q && `"${d.q}"`].filter(Boolean)
    return bits.length ? bits.join(' ') : 'a search'
  }
  const bits = [d.beds && `${d.beds} BHK`, d.type, d.city && `in ${d.city}`].filter(Boolean)
  return bits.length ? bits.join(' ') : d.id || ''
}

const fmt = (at) => new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/**
 * One person's full on-site history — every view / search / save / compare, newest first, with the IP and
 * best-effort city/region/pincode it happened from (never exact — see backend/src/lib/geo.js). Only ever
 * recorded for a signed-in, consenting account.
 */
export default function UserActivitySheet({ userId, onClose }) {
  const [state, setState] = useState({ loading: true, items: [], user: null, error: '' })
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    if (!userId) return
    setState((s) => ({ ...s, loading: true }))
    api(`/admin/users/${userId}/activity?limit=30&page=${page}`)
      .then((d) => { setState({ loading: false, items: d.items, user: d.user, error: '' }); setPages(d.pages) })
      .catch((err) => setState({ loading: false, items: [], user: null, error: err.message }))
  }, [userId, page])

  return (
    <GlassSheet open={Boolean(userId)} onClose={onClose} title={state.user ? `${state.user.name}'s activity` : 'Activity'} maxWidth="max-w-lg">
      {state.error && <p className="text-[var(--color-danger)] text-sm">{state.error}</p>}
      {state.loading ? (
        <p className="text-secondary text-sm">Loading…</p>
      ) : state.items.length === 0 ? (
        <p className="text-secondary text-sm">No activity recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {state.items.map((e) => {
            const t = TYPE[e.type] ?? TYPE.visit
            const where = [e.geo?.city, e.geo?.region].filter(Boolean).join(', ')
            return (
              <div key={e.id} className="glass-weak rounded-[14px] p-3 flex items-start gap-3">
                <span className="w-8 h-8 rounded-full glass-strong flex items-center justify-center shrink-0 text-[var(--color-accent)]">
                  <t.icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.label}{summarise(e) ? ` — ${summarise(e)}` : ''}</p>
                  <p className="text-tertiary text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{fmt(e.at)}</span>
                    {e.ip && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {where || 'location unknown'}{e.geo?.pincode ? ` · ${e.geo.pincode}` : ''} <span className="font-mono">({e.ip})</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <GlassButton variant="glass" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</GlassButton>
              <span className="text-tertiary text-xs">Page {page} / {pages}</span>
              <GlassButton variant="glass" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Older</GlassButton>
            </div>
          )}
          <p className="text-tertiary text-xs pt-1">
            City/region/pincode are an estimate from the visitor's IP address, not always exact.
          </p>
        </div>
      )}
    </GlassSheet>
  )
}
