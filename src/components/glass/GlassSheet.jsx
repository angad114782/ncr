import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * The *visual* viewport, not the layout one. Two mobile keyboard quirks this sheet has to dodge:
 *  - opening the keyboard shrinks visualViewport.height but not window.innerHeight, so a sheet
 *    sized/anchored off the layout viewport slides down under the keyboard;
 *  - iOS also pans the visual viewport on its own to keep the focused field above the keyboard —
 *    that fires `scroll` on visualViewport (not `resize`) and moves offsetTop/offsetLeft, not
 *    height. A `position: fixed` element ignores that pan and stays put against the (now-hidden)
 *    layout viewport, so it visibly drifts a few px on every focus change without this.
 */
function readViewport() {
  if (typeof window === 'undefined') return { h: 0, top: 0, left: 0 }
  const vv = window.visualViewport
  return vv ? { h: vv.height, top: vv.offsetTop, left: vv.offsetLeft } : { h: window.innerHeight, top: 0, left: 0 }
}

export default function GlassSheet({ open, onClose, title, children, maxWidth = 'max-w-md' }) {
  const [viewport, setViewport] = useState(readViewport)

  useEffect(() => {
    if (!open) return undefined
    const vv = window.visualViewport
    const update = () => setViewport(readViewport())
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)

    // Lock the page behind the sheet so it can't scroll around it independently of the pan above.
    const { body } = document
    const scrollY = window.scrollY
    const prev = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right }
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'

    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      body.style.overflow = prev.overflow
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      window.scrollTo(0, scrollY)
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ top: viewport.top, left: viewport.left, width: '100%', height: viewport.h }}
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
            style={{ maxHeight: Math.max(viewport.h - 24, 280) }}
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
