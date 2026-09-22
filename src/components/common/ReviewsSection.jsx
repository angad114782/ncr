import { useState } from 'react'
import { Star } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import Avatar from './Avatar'
import { useReviews } from '../../hooks/useReviews'
import { USE_API } from '../../api/client'

function Stars({ value, size = 14 }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-[var(--color-warning)] text-[var(--color-warning)]' : 'text-tertiary'} />
      ))}
    </span>
  )
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5 spring hover:scale-110"
        >
          <Star size={26} className={n <= (hover || value) ? 'fill-[var(--color-warning)] text-[var(--color-warning)]' : 'text-tertiary'} />
        </button>
      ))}
    </div>
  )
}

const fmt = (at) => new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Real, admin-approved reviews for an agent or a property, plus a form to leave one. Signed-in only — writing
 * a review opens sign-in first if needed (see hooks/useReviews.js). Hidden in local-storage dev mode: there is
 * no backend there to moderate reviews against, so nothing here would be honest to show.
 */
export default function ReviewsSection({ targetType, targetId, className = '' }) {
  const { items, average, total, mine, submitting, notice, submit } = useReviews(targetType, targetId)
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')

  if (!USE_API) return null

  const startEdit = () => {
    setRating(mine?.rating || 0)
    setText(mine?.text || '')
    setOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!rating) return
    submit(rating, text.trim())
    setOpen(false)
  }

  return (
    <GlassCard hover={false} className={`p-6 ${className}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
          <h3 className="font-semibold text-lg">Reviews</h3>
          {total > 0 ? (
            <p className="text-secondary text-sm flex items-center gap-2 mt-1">
              <Stars value={average} /> <span className="font-medium">{average}</span> · {total} review{total > 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-secondary text-sm mt-1">No reviews yet — be the first.</p>
          )}
        </div>
        {!open && (
          <GlassButton variant="glass" size="sm" onClick={startEdit}>
            {mine ? 'Edit your review' : 'Write a review'}
          </GlassButton>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="glass-weak rounded-[16px] p-4 mb-4 flex flex-col gap-3">
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1500}
            rows={3}
            placeholder="What was your experience? (optional)"
            className="glass rounded-[12px] px-3 py-2 text-sm outline-none resize-none w-full"
          />
          <div className="flex items-center gap-2">
            <GlassButton type="submit" size="sm" disabled={!rating || submitting}>{submitting ? 'Submitting…' : 'Submit'}</GlassButton>
            <GlassButton type="button" variant="glass" size="sm" onClick={() => setOpen(false)}>Cancel</GlassButton>
          </div>
        </form>
      )}

      {notice && !open && <p className="text-sm text-[var(--color-accent)] mb-4">{notice}</p>}

      {mine && !open && mine.status !== 'approved' && (
        <p className="glass-weak rounded-[12px] px-4 py-2.5 text-xs text-secondary mb-4">
          Your review ({mine.rating}★) is {mine.status === 'pending' ? 'awaiting approval' : 'not shown publicly'} — only you can see this note.
        </p>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-4">
          {items.map((r) => (
            <div key={r.id} className="flex items-start gap-3">
              <Avatar name={r.userName} alt={r.userName} className="w-9 h-9 rounded-full object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{r.userName}</p>
                  <Stars value={r.rating} size={12} />
                  <span className="text-tertiary text-xs">{fmt(r.createdAt)}</span>
                </div>
                {r.text && <p className="text-secondary text-sm mt-1 leading-relaxed">{r.text}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
