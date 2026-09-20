import { useState } from 'react'
import { useIsoLayoutEffect } from '../../hooks/usePersistedState'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'

const DISMISS_KEY = 're-banner-dismissed'
const BANNER_HEIGHT = '40px'

export default function TopBanner() {
  const { topBanner } = useSettings()
  // '' on the first render (server + browser agree); the visitor's dismissal is read before paint.
  const [dismissedText, setDismissedText] = useState('')
  useIsoLayoutEffect(() => {
    try {
      setDismissedText(localStorage.getItem(DISMISS_KEY) || '')
    } catch {
      /* ignore */
    }
  }, [])

  // Re-appears automatically if the admin changes the message, since the
  // dismissal is keyed to the exact text the visitor dismissed.
  const visible = topBanner.enabled && !!topBanner.text.trim() && topBanner.text !== dismissedText

  useIsoLayoutEffect(() => {
    document.documentElement.style.setProperty('--banner-h', visible ? BANNER_HEIGHT : '0px')
  }, [visible])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, topBanner.text)
    } catch {
      /* ignore */
    }
    setDismissedText(topBanner.text)
  }

  const content = (
    <>
      <span className="truncate">{topBanner.text}</span>
      {topBanner.link && topBanner.linkLabel && (
        <span className="underline underline-offset-2 font-semibold shrink-0">{topBanner.linkLabel}</span>
      )}
    </>
  )

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center px-10 text-sm font-medium text-white bg-[var(--color-accent)]"
      style={{ height: BANNER_HEIGHT }}
    >
      {topBanner.link ? (
        topBanner.link.startsWith('http') ? (
          <a href={topBanner.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 max-w-full justify-center hover:opacity-90">
            {content}
          </a>
        ) : (
          <Link to={topBanner.link} className="flex items-center gap-2 max-w-full justify-center hover:opacity-90">
            {content}
          </Link>
        )
      ) : (
        <div className="flex items-center gap-2 max-w-full justify-center">{content}</div>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="absolute right-2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 spring shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}
