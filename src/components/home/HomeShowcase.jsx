import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Hand, Moon, Sun } from 'lucide-react'
import GlassButton from '../glass/GlassButton'
import { useSettings } from '../../context/SettingsContext'

// three.js is ~600 kB — load it only when the visitor scrolls near this section.
const HouseScene = lazy(() => import('../three/HouseScene'))

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function Fallback({ text }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-center p-8 text-secondary text-sm">
      {text}
    </div>
  )
}

/**
 * "Step inside a home" — an interactive 3D house. The section text, hotspot labels and
 * button come from Admin → Site Content → Home blocks.
 */
export default function HomeShowcase() {
  const { siteContent, fill } = useSettings()
  const c = siteContent.showcase
  const wrap = useRef(null)
  const [near, setNear] = useState(false) // start loading
  const [visible, setVisible] = useState(false) // currently on screen → animate
  const [ready, setReady] = useState(false)
  const [night, setNight] = useState(false)
  const [webgl, setWebgl] = useState(true) // assume yes on the server; probed in the browser

  useEffect(() => { setWebgl(supportsWebGL()) }, [])

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); setVisible(true); return undefined }
    const preload = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '400px' })
    const live = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 })
    preload.observe(el)
    live.observe(el)
    return () => { preload.disconnect(); live.disconnect() }
  }, [])

  return (
    <section className="mb-16" aria-labelledby="showcase-heading">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-stretch">
        <div className="flex flex-col justify-center gap-4 lg:pr-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">{fill(c.eyebrow)}</span>
          <h2 id="showcase-heading" className="text-3xl md:text-4xl font-bold leading-tight">{fill(c.title)}</h2>
          <p className="text-secondary leading-relaxed">{fill(c.subtitle)}</p>
          <ul className="flex flex-wrap gap-2">
            {c.hotspots.slice(0, 4).map((h, i) => (
              <li key={i} className="glass-weak rounded-full px-3.5 py-1.5 text-sm">{h.label}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link to={c.ctaLink || '/listings'}><GlassButton>{c.ctaLabel} <ArrowRight size={16} /></GlassButton></Link>
          </div>
          <p className="text-tertiary text-xs">Illustrative 3D concept home — not a specific listing.</p>
        </div>

        <div
          ref={wrap}
          className="relative h-[380px] sm:h-[460px] lg:h-[540px] rounded-[32px] overflow-hidden border border-[var(--glass-border)] shadow-[var(--glass-shadow)] transition-[background] duration-700"
          style={{ background: night ? 'linear-gradient(180deg,#0c1220 0%,#241a30 60%,#3a2530 100%)' : 'linear-gradient(180deg,#cfe4f3 0%,#f3e6d4 70%,#f7dcc0 100%)' }}
        >
          {near && webgl ? (
            <SceneBoundary fallback={<Fallback text="The 3D view couldn’t start on this device — browse our real listings instead." />}>
              <Suspense fallback={null}>
                <HouseScene night={night} active={visible} hotspots={c.hotspots} onReady={() => setReady(true)} />
              </Suspense>
            </SceneBoundary>
          ) : (
            !webgl && <Fallback text="3D view needs WebGL, which this browser has turned off." />
          )}

          {near && webgl && !ready && (
            <div className="absolute inset-0 skeleton !rounded-none pointer-events-none" aria-hidden="true" />
          )}

          <div className="absolute top-4 left-4 glass-strong rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 pointer-events-none">
            <Hand size={13} className="text-[var(--color-accent)]" /> Drag to look around · tap the glowing dots
          </div>

          <button
            type="button"
            onClick={() => setNight((v) => !v)}
            aria-pressed={night}
            aria-label={night ? 'Switch to day view' : 'Switch to night view'}
            className="absolute bottom-4 right-4 glass-strong rounded-full pl-3 pr-4 h-11 flex items-center gap-2 text-sm font-medium spring active:scale-95"
          >
            {night ? <Sun size={16} className="text-[var(--color-warning)]" /> : <Moon size={16} className="text-[var(--color-accent)]" />}
            {night ? 'Day' : 'Night'}
          </button>
        </div>
      </div>
    </section>
  )
}
