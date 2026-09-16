import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GitCompare, X } from 'lucide-react'
import { useData } from '../../context/DataContext'

export default function CompareBar() {
  const { properties, compareIds, toggleCompare, clearCompare } = useData()
  const navigate = useNavigate()

  const items = properties.filter((p) => compareIds.includes(p.id))

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl"
        >
          <div className="glass-strong rounded-[24px] p-3 flex items-center gap-3">
            <div className="flex -space-x-3">
              {items.map((p) => (
                <div key={p.id} className="relative">
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-[var(--bg-base)]"
                  />
                  <button
                    onClick={() => toggleCompare(p.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-danger)] text-white flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-sm text-secondary flex-1 hidden sm:block">
              {items.length} of 3 selected for comparison
            </p>
            <button
              onClick={clearCompare}
              className="text-xs text-secondary px-2 hover:text-[var(--color-danger)] shrink-0"
            >
              Clear
            </button>
            <button
              onClick={() => navigate('/compare')}
              disabled={items.length < 2}
              className="glass rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1.5 spring hover:scale-105 disabled:opacity-40 disabled:pointer-events-none text-[var(--color-accent)] shrink-0"
            >
              <GitCompare size={15} /> Compare
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
