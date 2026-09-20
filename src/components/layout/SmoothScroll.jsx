import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { smoothScrollSupported, startSmoothScroll } from '../../utils/smoothScroll'

/** Turns on inertial smooth scrolling for the public site (see utils/smoothScroll.js). Renders nothing. */
export default function SmoothScroll() {
  const { pathname } = useLocation()
  const enabled = !/^\/(admin|dashboard)(\/|$)/.test(pathname)

  useEffect(() => {
    if (!enabled || !smoothScrollSupported()) return undefined
    let stop = null
    let cancelled = false
    // Wait until the browser is idle so smooth scrolling never competes with first paint / hydration.
    const start = () => startSmoothScroll().then((fn) => (cancelled ? fn() : (stop = fn)))
    const idle = window.requestIdleCallback ? window.requestIdleCallback(start, { timeout: 2000 }) : window.setTimeout(start, 600)
    return () => {
      cancelled = true
      if (window.cancelIdleCallback && window.requestIdleCallback) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
      stop?.()
    }
  }, [enabled])

  return null
}
