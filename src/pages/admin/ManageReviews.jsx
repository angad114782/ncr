import { useEffect, useState } from 'react'
import { Check, MessageSquareText, RefreshCw, Star, Trash2, X } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import { USE_API, api } from '../../api/client'

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
]

function Stars({ value }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} className={n <= value ? 'fill-[var(--color-warning)] text-[var(--color-warning)]' : 'text-tertiary'} />
      ))}
    </span>
  )
}

/**
 * User-submitted reviews of an agent or a property — moderated the same way as Testimonials (admin-approved
 * before they're public), but these come from real signed-in visitors, not admin-authored copy. Approve /
 * reject one at a time, or select several and act on them together.
 */
export default function ManageReviews() {
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [selected, setSelected] = useState([])

  const load = async (s = status) => {
    setError('')
    try {
      const data = await api(`/admin/reviews?limit=100${s ? `&status=${s}` : ''}`)
      setItems(data.items)
      setPendingCount(data.pendingReview)
      setSelected([])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (USE_API) load(status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const decide = async (id, action, note) => {
    setBusyId(id)
    try {
      await api(`/admin/reviews/${id}/${action}`, note !== undefined ? { method: 'POST', body: { note } } : { method: 'POST' })
      setItems((prev) => prev.filter((r) => r.id !== id))
      setPendingCount((n) => (status === 'pending' || status === '' ? Math.max(0, n - (action !== 'delete' ? 1 : 0)) : n))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  const remove = async (id) => {
    setBusyId(id)
    try {
      await api(`/admin/reviews/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  const bulk = async (action) => {
    if (selected.length === 0) return
    try {
      await api('/admin/reviews/bulk/action', { method: 'POST', body: { ids: selected, action } })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleSelect = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  if (!USE_API) {
    return (
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Ratings & Reviews</h1>
        <p className="text-secondary">Reviews from signed-in visitors show here once the site is connected to the live server.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Ratings & Reviews</h1>
        <GlassButton variant="glass" size="sm" icon={RefreshCw} onClick={() => load()}>Refresh</GlassButton>
      </div>
      <p className="text-secondary mb-6">
        Real reviews left by signed-in visitors for an agent or a property. Nothing here is public until approved —
        {pendingCount > 0 ? ` ${pendingCount} waiting right now.` : ' nothing is waiting right now.'}
      </p>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.value || 'all'}
            type="button"
            onClick={() => setStatus(t.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium spring ${status === t.value ? 'glass-strong text-[var(--color-accent)]' : 'glass text-secondary'}`}
          >
            {t.label}{t.value === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
        {selected.length > 0 && (
          <span className="flex items-center gap-2 ml-2">
            <span className="text-tertiary text-xs">{selected.length} selected</span>
            <GlassButton variant="glass" size="sm" icon={Check} onClick={() => bulk('approve')}>Approve</GlassButton>
            <GlassButton variant="glass" size="sm" icon={X} onClick={() => bulk('reject')}>Reject</GlassButton>
            <GlassButton variant="glass" size="sm" icon={Trash2} onClick={() => bulk('delete')}>Delete</GlassButton>
          </span>
        )}
      </div>

      {error && <p className="text-[var(--color-danger)] text-sm mb-4">{error}</p>}

      {items === null ? (
        <p className="text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center text-secondary">
          <MessageSquareText className="mx-auto mb-2 text-tertiary" size={28} />
          No {status || ''} reviews.
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <GlassCard key={r.id} hover={false} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
              <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} aria-label={`Select review by ${r.userName}`} className="mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold flex items-center gap-2 flex-wrap">
                  {r.userName} <Stars value={r.rating} />
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${r.status === 'approved' ? 'text-[var(--color-success)] glass-weak' : r.status === 'rejected' ? 'text-[var(--color-danger)] glass-weak' : 'text-[var(--color-warning)] glass-weak'}`}>{r.status}</span>
                </p>
                <p className="text-secondary text-sm mt-1">
                  {r.targetType === 'agent' ? 'Agent' : 'Property'}: <span className="font-medium">{r.targetLabel}</span> · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {r.text && <p className="text-sm mt-2 leading-relaxed">{r.text}</p>}
                {r.reviewNote && <p className="text-tertiary text-xs mt-1">Note: {r.reviewNote}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.status !== 'approved' && (
                  <button type="button" aria-label="Approve" title="Approve" disabled={busyId === r.id} onClick={() => decide(r.id, 'approve')} className="glass w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-success)]"><Check size={13} /></button>
                )}
                {r.status !== 'rejected' && (
                  <button type="button" aria-label="Reject" title="Reject" disabled={busyId === r.id} onClick={() => decide(r.id, 'reject', '')} className="glass w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-warning)]"><X size={13} /></button>
                )}
                <button type="button" aria-label="Delete" title="Delete" disabled={busyId === r.id} onClick={() => remove(r.id)} className="glass w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-danger)]"><Trash2 size={13} /></button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
