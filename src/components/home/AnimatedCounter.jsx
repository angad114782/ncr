import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'
import { useIsoLayoutEffect } from '../../hooks/usePersistedState'

/**
 * Counts up when scrolled into view. The pre-rendered HTML (what Google and AI crawlers read)
 * already contains the real number — the count-up only replays for counters that start
 * below the fold, so no crawler or visitor ever sees "0+".
 */
export default function AnimatedCounter({ value, suffix = '', decimals = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(value)
  const [armed, setArmed] = useState(false)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top > window.innerHeight * 0.95) {
      setDisplay(0)
      setArmed(true)
    }
  }, [])

  useEffect(() => {
    if (!armed) {
      setDisplay(value)
      return undefined
    }
    if (!inView) return undefined
    const controls = animate(0, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [armed, inView, value])

  return (
    <span ref={ref}>
      {Number(display).toFixed(decimals)}
      {suffix}
    </span>
  )
}
