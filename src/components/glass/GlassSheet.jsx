import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export default function GlassSheet({ open, onClose, title, children, maxWidth = 'max-w-md' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
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
            className={`glass-strong relative w-full ${maxWidth} rounded-t-[28px] sm:rounded-[28px] p-6 sm:p-8 max-h-[88vh] overflow-y-auto`}
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
