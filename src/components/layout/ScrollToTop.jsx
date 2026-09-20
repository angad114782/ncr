import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { scrollToElement, scrollToY } from '../../utils/smoothScroll'

/**
 * React Router (BrowserRouter) keeps the previous page's scroll offset, so a new
 * page opened from the middle of the old one appeared scrolled down. This resets
 * to the top on every navigation, except:
 *  • Back / Forward — restores where the visitor was on that page.
 *  • #anchor links — scrolls to that element.
 *  • navigations that pass state { keepScroll: true } (e.g. changing a filter on
 *    /listings) — the page stays where it is.
 */
export default function ScrollToTop() {
  const { pathname, search, hash, key, state } = useLocation()
  const navType = useNavigationType()
  const positions = useRef({}) // history-entry key → scrollY
  const currentKey = useRef(key)
  const renderedUrl = useRef(`${pathname}${search}`)

  // Remember the scroll offset of the page being viewed, per history entry.
  useEffect(() => {
    const onScroll = () => {
      // The browser's URL changes the instant a link is clicked, but React swaps the page a
      // moment later. Scroll events in that gap belong to the OLD page's DOM being replaced
      // (the offset collapses to 0) — recording them would wipe the saved position.
      if (`${window.location.pathname}${window.location.search}` !== renderedUrl.current) return
      positions.current[currentKey.current] = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // We manage restoration ourselves; the browser's own would fire before the new page has rendered.
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    currentKey.current = key
    renderedUrl.current = `${pathname}${search}`

    if (state?.keepScroll) return
    if (navType === 'POP' && positions.current[key] != null) {
      scrollToY(positions.current[key], { immediate: true })
      return
    }
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) {
        scrollToElement(el)
        return
      }
    }
    scrollToY(0, { immediate: true }) // instant: page changes never animate
    // key changes on every navigation, so it alone is enough to re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pathname, search, hash])

  return null
}
