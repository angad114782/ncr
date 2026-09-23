import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { scrollToY } from '../../utils/smoothScroll'

const SHOW_AFTER = 480

/**
 * Floating "back to top" button, public pages only (mounted in PublicLayout). Distinct from
 * `ScrollToTop` (mounted app-wide in App.jsx), which resets/restores scroll position on
 * navigation — this is the visible button a visitor clicks to scroll back up on a long page.
 * Sits above ContactRail's mobile call/WhatsApp bar and clear of its desktop vertical rail
 * (which is vertically centered, not bottom-anchored — see ContactRail.jsx).
 */
export default function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={() => scrollToY(0)}
          aria-label="Back to top"
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="fixed right-4 md:right-6 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-40 w-11 h-11 md:w-12 md:h-12 rounded-full glass-strong flex items-center justify-center text-[var(--color-accent)] spring hover:scale-105 active:scale-95"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
