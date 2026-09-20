import { useEffect, useRef, useState } from 'react'
import { useIsoLayoutEffect } from '../../hooks/usePersistedState'

/**
 * Scroll-in entrance for below-the-fold blocks — built so it never hurts SEO or speed:
 *  • The HTML (pre-rendered and first client render) is fully VISIBLE, so crawlers, no-JS
 *    visitors and the largest-paint element are never hidden behind an animation.
 *  • Only blocks that start below the fold are hidden (before the first paint, so nothing
 *    flashes), then revealed with a CSS transition as they scroll into view.
 *  • \`content-visibility: auto\` lets the browser skip laying out / painting off-screen
 *    sections until they are near, which is a large win on this long home page.
 */
export default function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const [hidden, setHidden] = useState(false)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top > window.innerHeight * 0.95) setHidden(true)
  }, [])

  useEffect(() => {
    if (!hidden) return undefined
    const el = ref.current
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setHidden(false)
        io.disconnect()
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hidden])

  return (
    <div
      ref={ref}
      className="reveal-block"
      data-hidden={hidden || undefined}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  )
}
