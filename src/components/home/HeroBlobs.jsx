import { motion } from 'framer-motion'

// Soft brand-coloured glow inside the hero panel. It is clipped by the panel's own
// rounded corners (the panel has overflow-hidden), so there is never a hard edge.
export default function HeroBlobs() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl opacity-30"
        style={{ background: 'var(--color-accent)', top: '-6rem', left: '-5rem' }}
        animate={{ x: [0, 30, -20, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl opacity-25"
        style={{ background: 'var(--color-accent-2)', bottom: '-7rem', right: '-5rem' }}
        animate={{ x: [0, -25, 15, 0], y: [0, -15, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
