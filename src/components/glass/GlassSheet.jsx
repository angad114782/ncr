import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export default function GlassSheet({ open, onClose, title, children, maxWidth = 'max-w-md' }) {
  // Phones resize the *visual* viewport when the keyboard opens, not the layout one — a plain
  // `fixed inset-0` sheet stays anchored to the full (keyboard-covered) height, so it slides down
  // under the keyboard with an empty, scrollable gap below the form. Track the visual viewport and
  // lock the page behind the sheet so neither the sheet nor the background can scroll around it.
  const [viewportH, setViewportH] = useState(null)

  useEffect(() => {
    if (!open) return undefined
    const vv = window.visualViewport
    const updateHeight = () => setViewportH(vv ? vv.height : window.innerHeight)
    updateHeight()
    vv?.addEventListener('resize', updateHeight)

    const { body } = document
    const scrollY = window.scrollY
    const prev = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right }
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'

    return () => {
      vv?.removeEventListener('resize', updateHeight)
      body.style.overflow = prev.overflow
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      window.scrollTo(0, scrollY)
      setViewportH(null)
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ height: viewportH ? `${viewportH}px` : '100dvh' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={`glass-strong relative w-full ${maxWidth} rounded-t-[28px] sm:rounded-[28px] p-6 sm:p-8 overflow-y-auto`}
            style={{ maxHeight: viewportH ? `${Math.max(viewportH - 24, 280)}px` : '88vh' }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="glass w-9 h-9 rounded-full flex items-center justify-center spring hover:scale-105"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
