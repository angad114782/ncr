import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function RotatingWord({ words = ['Home'] }) {
  const list = words.filter(Boolean).length ? words.filter(Boolean) : ['Home']
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (list.length < 2) return undefined
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), 2200)
    return () => clearInterval(id)
  }, [list.length])

  const word = list[index % list.length]

  return (
    <span className="relative inline-block min-w-[3.5ch] text-[var(--color-accent)] align-top">
      <AnimatePresence mode="wait">
        <motion.span
          key={word}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="inline-block"
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
