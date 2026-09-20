import { motion } from 'framer-motion'

export default function HeroBlobs() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-40"
        style={{ background: 'var(--color-accent)', top: '-4rem', left: '-3rem' }}
        animate={{ x: [0, 30, -20, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-30"
        style={{ background: 'var(--color-accent-2)', top: '2rem', right: '-4rem' }}
        animate={{ x: [0, -25, 15, 0], y: [0, -15, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--color-teal)', bottom: '-3rem', left: '30%' }}
        animate={{ x: [0, 20, -20, 0], y: [0, -20, 10, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
