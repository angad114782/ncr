import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

const PILL_SIZE = 'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium spring shrink-0'

/**
 * Same sliding-pill pagination as the public Listings page (src/pages/public/Listings.jsx), but
 * page-state-driven (onClick) instead of link-driven — admin tables live behind auth, so there's no
 * crawler/SEO reason to spend a real URL per page here.
 */
function paginationItems(current, total, siblings = 1) {
  const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i)
  const totalVisible = siblings * 2 + 5
  if (total <= totalVisible) return range(1, total)

  const left = Math.max(current - siblings, 1)
  const right = Math.min(current + siblings, total)
  const showLeftDots = left > 2
  const showRightDots = right < total - 1

  if (!showLeftDots && showRightDots) return [...range(1, 3 + siblings * 2), '…', total]
  if (showLeftDots && !showRightDots) return [1, '…', ...range(total - (2 + siblings * 2), total)]
  return [1, '…', ...range(left, right), '…', total]
}

export default function AdminPagination({ page, totalPages, onChange, layoutId = 'admin-pagination-pill' }) {
  const [jump, setJump] = useState('')

  if (totalPages <= 1) return null

  const goToJump = (e) => {
    e.preventDefault()
    const n = Math.round(Number(jump))
    if (n >= 1 && n <= totalPages && n !== page) onChange(n)
    setJump('')
  }

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center gap-3 mt-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className={`${PILL_SIZE} glass text-secondary hover:scale-105 disabled:opacity-30 disabled:hover:scale-100`}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="glass-strong rounded-full p-1 flex items-center gap-0.5">
          {paginationItems(page, totalPages).map((item, i) =>
            item === '…' ? (
              <span key={`dots-${i}`} aria-hidden="true" className={`${PILL_SIZE} text-secondary select-none`}>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={page === item ? 'page' : undefined}
                onClick={() => onChange(item)}
                className={`relative ${PILL_SIZE} ${page === item ? 'text-white' : 'text-secondary hover:scale-105'}`}
              >
                {page === item && (
                  <motion.span
                    layoutId={layoutId}
                    className="absolute inset-0.5 rounded-full"
                    style={{ background: 'var(--color-accent)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{item}</span>
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          aria-label="Next page"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className={`${PILL_SIZE} glass text-secondary hover:scale-105 disabled:opacity-30 disabled:hover:scale-100`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {totalPages > 6 && (
        <form onSubmit={goToJump} className="flex items-center gap-2 text-xs text-secondary">
          <span>
            Page {page} of {totalPages} · Jump to
          </span>
          <input
            type="number"
            min={1}
            max={totalPages}
            inputMode="numeric"
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            placeholder={String(page)}
            aria-label="Jump to page"
            className="glass-weak w-14 h-8 rounded-full text-center text-[16px] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
          />
          <button type="submit" aria-label="Go to page" className="glass w-8 h-8 rounded-full flex items-center justify-center spring hover:scale-105">
            <ArrowRight size={13} />
          </button>
        </form>
      )}
    </nav>
  )
}
