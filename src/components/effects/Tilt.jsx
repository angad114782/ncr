import { useRef } from 'react'

const canHover = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Cursor-driven 3D tilt with a moving light glare. Wraps any block: the card leans toward
 * the pointer and a soft highlight follows it. Styles are written straight to the DOM node
 * (no React re-render per mouse move). Does nothing on touch screens or with reduced motion.
 */
export default function Tilt({ children, className = '', max = 7, scale = 1.02, glare = true }) {
  const box = useRef(null)
  const shine = useRef(null)

  const move = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    const el = box.current
    if (!el || !canHover()) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.transition = 'transform 90ms ease-out'
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 2 * max}deg) rotateY(${(px - 0.5) * 2 * max}deg) scale3d(${scale},${scale},${scale})`
    if (shine.current) {
      shine.current.style.opacity = '1'
      shine.current.style.background = `radial-gradient(360px circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.28), transparent 55%)`
    }
  }

  const leave = () => {
    const el = box.current
    if (!el) return
    el.style.transition = 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)'
    el.style.transform = ''
    if (shine.current) shine.current.style.opacity = '0'
  }

  return (
    <div ref={box} onPointerMove={move} onPointerLeave={leave} className={`relative will-change-transform ${className}`} style={{ transformStyle: 'preserve-3d' }}>
      {children}
      {glare && (
        <span
          ref={shine}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
          style={{ mixBlendMode: 'soft-light' }}
        />
      )}
    </div>
  )
}
