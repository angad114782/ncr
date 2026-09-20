import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Sparkles, X } from 'lucide-react'
import GlassButton from '../glass/GlassButton'
import { useAuth } from '../../context/AuthContext'
import { useInterest } from '../../context/InterestContext'
import { useSettings } from '../../context/SettingsContext'

const STORE = 're-nudge'
const HIDDEN_ON = /^\/(admin|dashboard|agent|contact|thank-you|compare|privacy|terms|disclaimer)(\/|$)/
const DAY = 24 * 60 * 60 * 1000

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) ?? {}
  } catch {
    return {}
  }
}
function writeState(next) {
  try {
    localStorage.setItem(STORE, JSON.stringify(next))
  } catch {
    /* storage blocked → the prompt may show again, which is harmless */
  }
}

/**
 * The gentle "create a free account" card. It appears only once a visitor has shown real interest
 * (viewed homes, searched, saved one), only after a short delay, never on top of forms or panels,
 * never while they are signed in, and it stays away for days after "Not now". It never blocks
 * the page — content (and Googlebot) is never behind a login.
 */
export default function LoginNudge({ onOpenAuth, authOpen }) {
  const { user, ready: authReady } = useAuth()
  const { summary, profile, ready: interestReady } = useInterest()
  const { siteContent, fill } = useSettings()
  const { pathname } = useLocation()
  const cfg = siteContent.nudge
  const [open, setOpen] = useState(false)

  const justSaved = profile.lastEvent === 'save' && Date.now() - profile.lastEventAt < 6000
  const interested = summary.score >= (cfg.minScore ?? 4) || justSaved
  const eligible = Boolean(cfg.enabled && authReady && interestReady && !user && interested && !HIDDEN_ON.test(pathname))

  useEffect(() => {
    if (!eligible) {
      setOpen(false)
      return undefined
    }
    const state = readState()
    if (state.until && Date.now() < state.until) return undefined
    try {
      // once per browser session unless they just saved a home (a natural moment to ask)
      if (sessionStorage.getItem('re-nudge-shown') && !justSaved) return undefined
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => {
      setOpen(true)
      try { sessionStorage.setItem('re-nudge-shown', '1') } catch { /* ignore */ }
    }, justSaved ? 800 : Math.max(0, Number(cfg.delaySeconds) || 0) * 1000)
    return () => clearTimeout(t)
  }, [eligible, justSaved, pathname, cfg.delaySeconds])

  const dismiss = () => {
    const state = readState()
    const count = (state.dismissed ?? 0) + 1
    writeState({ dismissed: count, until: Date.now() + (Number(cfg.cooldownDays) || 3) * DAY * (count > 1 ? 4 : 1) })
    setOpen(false)
  }

  const accept = () => {
    setOpen(false)
    onOpenAuth('signup', 'nudge')
  }

  const focus = summary.focus
  const title = focus ? cfg.title.replace(/\{focus\}/g, focus) : cfg.titleFallback

  return (
    <AnimatePresence>
      {open && !authOpen && (
        <motion.aside
          role="complementary"
          aria-label="Create a free account"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed z-[45] left-3 right-3 sm:left-6 sm:right-auto sm:w-[380px] glass-strong rounded-[24px] p-5"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary spring"
          >
            <X size={16} />
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)] flex items-center gap-1.5 mb-1.5">
            <Sparkles size={13} /> Free · takes 20 seconds
          </p>
          <h2 className="font-bold text-lg leading-snug pr-6 mb-1.5">{title}</h2>
          <p className="text-secondary text-sm leading-relaxed mb-3">{fill(cfg.text)}</p>
          <ul className="flex flex-col gap-1.5 mb-4">
            {(cfg.benefits ?? []).slice(0, 3).map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <Check size={15} className="text-[var(--color-success)] mt-0.5 shrink-0" />
                <span>{fill(b)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <GlassButton onClick={accept} className="flex-1 justify-center">{cfg.buttonLabel}</GlassButton>
            <button type="button" onClick={dismiss} className="text-sm text-secondary hover:text-primary px-2 py-2">{cfg.dismissLabel}</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
