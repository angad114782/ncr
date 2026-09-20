// Smooth (inertial) scrolling with Lenis, shared by the whole app.
//
// Rules that keep it from getting in the way:
//  • desktop mouse / trackpad only — touch devices keep the browser's own (already smooth) scrolling
//  • off for visitors who asked for reduced motion, and off inside /admin and /dashboard
//  • anything that scrolls by itself (dialogs, textareas, selects, maps, overflow containers, or an
//    element marked data-lenis-prevent) keeps native wheel behaviour
//  • loaded after the page is interactive (dynamic import), so it never delays first paint

let lenis = null

export const getLenis = () => lenis

/** True when `node` (or an ancestor) scrolls on its own and must not be hijacked. */
export function scrollsByItself(node) {
  for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.hasAttribute?.('data-lenis-prevent')) return true
    if (el.matches?.('textarea, select, dialog, [role="dialog"], .leaflet-container')) return true
    const { overflowY } = getComputedStyle(el)
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true
  }
  return false
}

export const smoothScrollSupported = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Starts Lenis; resolves to a function that stops and removes it. */
export async function startSmoothScroll() {
  const { default: Lenis } = await import('lenis')
  const instance = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: true,
    anchors: { offset: -104 }, // same-page #links (blog contents) glide, clear of the sticky navbar
    prevent: (node) => scrollsByItself(node),
  })
  lenis = instance

  // The off-canvas mobile menu freezes the page (html.menu-open) — freeze Lenis with it.
  const root = document.documentElement
  const sync = () => (root.classList.contains('menu-open') ? instance.stop() : instance.start())
  const observer = new MutationObserver(sync)
  observer.observe(root, { attributes: true, attributeFilter: ['class'] })
  sync()

  return () => {
    observer.disconnect()
    instance.destroy()
    if (lenis === instance) lenis = null
  }
}

/**
 * Scroll to a position. `immediate` is for route changes (no animation); otherwise it glides.
 * Falls back to native scrolling when Lenis isn't running.
 */
export function scrollToY(y, { immediate = false } = {}) {
  if (lenis) lenis.scrollTo(y, { immediate, force: true })
  else window.scrollTo({ top: y, left: 0, behavior: immediate ? 'instant' : 'smooth' })
}

/** Scroll an element into view, clear of the sticky navbar. */
export function scrollToElement(el, { immediate = true, offset = -104 } = {}) {
  if (lenis) lenis.scrollTo(el, { immediate, offset, force: true })
  else el.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth' })
}
