import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { onApiError } from '../../api/client'

/** Shows why a background save failed (the change is rolled back). Rendered once per layout. */
export default function ApiToast() {
  const [message, setMessage] = useState('')

  useEffect(() => onApiError(setMessage), [])
  useEffect(() => {
    if (!message) return undefined
    const t = setTimeout(() => setMessage(''), 8000)
    return () => clearTimeout(t)
  }, [message])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[min(92vw,520px)] glass-strong rounded-[18px] p-4 flex items-start gap-3 border border-[var(--color-danger)]"
        >
          <AlertTriangle size={18} className="text-[var(--color-danger)] shrink-0 mt-0.5" />
          <p className="text-sm flex-1 leading-relaxed">{message}</p>
          <button type="button" onClick={() => setMessage('')} aria-label="Dismiss" className="text-secondary hover:text-primary shrink-0"><X size={16} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
