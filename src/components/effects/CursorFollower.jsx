import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/**
 * A soft ring that trails the mouse and swells over links / buttons / cards.
 * Desktop mouse only (skipped on touch and with reduced motion); the normal cursor
 * stays visible and the ring never blocks clicks.
 */
export default function CursorFollower() {
  const [enabled, setEnabled] = useState(false)
  const [big, setBig] = useState(false)
  const [visible, setVisible] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 380, damping: 32, mass: 0.6 })

  useEffect(() => {
    const ok =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setEnabled(ok)
    if (!ok) return undefined

    const move = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setVisible(true)
      setBig(!!e.target.closest?.('a, button, [role="button"], input, select, textarea, label, .glass'))
    }
    const leave = () => setVisible(false)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [x, y])

  if (!enabled) return null
  const size = big ? 46 : 26

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[90] rounded-full border border-[var(--color-accent)]"
      style={{
        x: sx,
        y: sy,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        opacity: visible ? (big ? 0.55 : 0.75) : 0,
        background: big ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent',
        transition: 'width 180ms ease, height 180ms ease, margin 180ms ease, opacity 200ms ease, background 180ms ease',
      }}
    />
  )
}
