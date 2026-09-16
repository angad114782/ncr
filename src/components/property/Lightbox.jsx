import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function Lightbox({ images, index, onClose, onChange }) {
  useEffect(() => {
    if (index === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onChange((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onChange((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onClose, onChange])

  return (
    <AnimatePresence>
      {index !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 glass w-10 h-10 rounded-full flex items-center justify-center text-white"
          >
            <X size={18} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onChange((index - 1 + images.length) % images.length) }}
            className="absolute left-4 md:left-8 glass w-11 h-11 rounded-full flex items-center justify-center text-white"
          >
            <ChevronLeft size={20} />
          </button>

          <motion.img
            key={images[index]}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            src={images[index]}
            alt=""
            className="max-w-full max-h-[85vh] rounded-[16px] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => { e.stopPropagation(); onChange((index + 1) % images.length) }}
            className="absolute right-4 md:right-8 glass w-11 h-11 rounded-full flex items-center justify-center text-white"
          >
            <ChevronRight size={20} />
          </button>

          <p className="absolute bottom-5 text-white/70 text-sm">
            {index + 1} / {images.length}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
