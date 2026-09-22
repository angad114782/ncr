import { useEffect } from 'react'

/**
 * Right-click / F12 / Ctrl+Shift+I,J,C / Ctrl+U deterrent on public pages — a best-effort nuisance, NOT real
 * protection. It does not stop "View Page Source" from a browser menu, a different browser, curl, a browser
 * extension, or anyone who simply disables JavaScript first — every one of those still shows the full page
 * source. It also blocks a legitimate visitor's right-click ("open link in new tab", copy text) and some
 * accessibility tools. Real secrets never belong in client-side code or a link's `href` regardless of this —
 * see docs/rules.md §21 (the actual fix for "the WhatsApp link leaks the agent's number" was gating that link,
 * not this). Mounted only in `PublicLayout` — never on `/admin`, `/agent` or `/dashboard`, so the team can
 * still use DevTools on their own site.
 */
export default function DisableInspect() {
  useEffect(() => {
    const blockContextMenu = (e) => e.preventDefault()
    const blockKeys = (e) => {
      const key = e.key?.toLowerCase()
      const combo =
        key === 'f12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(key)) || // Safari/Chrome on Mac
        (e.ctrlKey && key === 'u') ||
        (e.metaKey && e.altKey && key === 'u')
      if (combo) e.preventDefault()
    }
    document.addEventListener('contextmenu', blockContextMenu)
    document.addEventListener('keydown', blockKeys)
    return () => {
      document.removeEventListener('contextmenu', blockContextMenu)
      document.removeEventListener('keydown', blockKeys)
    }
  }, [])

  return null
}
