import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Gem, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

const HIDDEN_ON = /^\/(admin|dashboard|agent|contact|thank-you|privacy|terms|disclaimer)(\/|$)/
const BOT = /bot|crawl|spider|slurp|lighthouse|pagespeed|gtmetrix|prerender/i
const GOLD = 'linear-gradient(135deg, #F3D9B1 0%, #D9A876 45%, #B98552 100%)'

const flag = (key, set) => {
  try {
    if (set) sessionStorage.setItem(key, '1')
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false // storage blocked → the card may show again, which is harmless
  }
}

/**
 * The luxury "welcome" card (on arrival) and "before you go" card (exit intent) that invite a visitor to log in
 * or sign up with their mobile number. Text: Admin → Site Content → Welcome & exit card.
 *  • each card shows at most once per browser session, never to a signed-in visitor, never on the panels or forms,
 *    never to crawlers, and never before `delaySeconds` — the page and its content are never behind it;
 *  • closing the welcome card can open the sign-up form (setting `onClose`);
 *  • exit intent = the mouse leaving through the top of the window (desktop) or a quick swipe back up after
 *    reading well down the page (phones).
 */
export default function WelcomeModal({ onOpenAuth, authOpen, onOpenChange }) {
  const { user, ready } = useAuth()
  const { siteContent, fill } = useSettings()
  const { pathname } = useLocation()
  const cfg = siteContent.welcome ?? {}
  const benefits = (siteContent.nudge?.benefits ?? []).slice(0, 3)
  const [variant, setVariant] = useState(null) // 'welcome' | 'exit' | null
  const lastShownAt = useRef(0)
  const primaryRef = useRef(null)

  const bot = typeof navigator !== 'undefined' && BOT.test(navigator.userAgent)
  const eligible = Boolean(ready && !user && !bot && !HIDDEN_ON.test(pathname))

  const show = useCallback((kind) => {
    flag(`re-${kind}-shown`, true)
    lastShownAt.current = Date.now()
    setVariant(kind)
  }, [])

  // On arrival.
  useEffect(() => {
    if (!cfg.enabled || !eligible || variant || authOpen || flag('re-welcome-shown')) return undefined
    const t = setTimeout(() => show('welcome'), Math.max(0, Number(cfg.delaySeconds) || 0) * 1000)
    return () => clearTimeout(t)
  }, [cfg.enabled, cfg.delaySeconds, eligible, variant, authOpen, show])

  // On the way out.
  useEffect(() => {
    if (!cfg.exitEnabled || !eligible || variant || authOpen || flag('re-exit-shown')) return undefined
    const armedAt = Date.now() + 8000 // not in the first seconds
    const armed = () => Date.now() > armedAt && Date.now() - lastShownAt.current > 20000
    const onMouseOut = (e) => {
      if (armed() && !e.relatedTarget && e.clientY <= 0) show('exit')
    }
    let peak = 0
    let peakAt = 0
    const onScroll = () => {
      const y = window.scrollY
      const now = Date.now()
      if (y >= peak) {
        peak = y
        peakAt = now
      } else if (peak > 900 && peak - y > 350 && now - peakAt < 700 && armed()) show('exit')
    }
    const touch = window.matchMedia?.('(pointer: coarse)').matches
    if (touch) window.addEventListener('scroll', onScroll, { passive: true })
    else document.addEventListener('mouseout', onMouseOut)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseout', onMouseOut)
    }
  }, [cfg.exitEnabled, eligible, variant, authOpen, show])

  useEffect(() => {
    onOpenChange?.(Boolean(variant))
  }, [variant, onOpenChange])

  const close = useCallback(() => {
    const was = variant
    setVariant(null)
    if (was === 'welcome' && cfg.onClose !== 'nothing') onOpenAuth('signup', 'welcome')
  }, [variant, cfg.onClose, onOpenAuth])

  const go = (mode) => {
    const source = variant === 'exit' ? 'exit' : 'welcome'
    setVariant(null)
    onOpenAuth(mode, source)
  }

  useEffect(() => {
    if (!variant) return undefined
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => primaryRef.current?.focus(), 350)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [variant, close])

  const exit = variant === 'exit'
  const eyebrow = exit ? cfg.exitEyebrow : cfg.eyebrow
  const title = exit ? cfg.exitTitle : cfg.title
  const text = exit ? cfg.exitText : cfg.text

  return (
    <AnimatePresence>
      {variant && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={close} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            className="relative w-full max-w-[440px] rounded-[30px] overflow-hidden text-[#F6EBDD]"
            style={{
              background: 'radial-gradient(120% 70% at 50% -10%, rgba(217,168,118,0.28), transparent 60%), linear-gradient(165deg, #2B1F17 0%, #17100B 62%, #0E0A07 100%)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(217,168,118,0.35), inset 0 1px 0 rgba(255,236,208,0.12)',
            }}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[#F6EBDD]/70 hover:text-[#F6EBDD] hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="px-7 pt-10 pb-7 sm:px-9 text-center">
              <span className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center text-[#2A1C10]" style={{ background: GOLD, boxShadow: '0 8px 28px rgba(217,168,118,0.35)' }}>
                <Gem size={24} strokeWidth={1.75} />
              </span>
              {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#D9A876] mb-3">{eyebrow}</p>}
              <h2 id="welcome-title" className="text-[30px] sm:text-[34px] leading-[1.12] font-semibold tracking-tight mb-3" style={{ fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" }}>
                {fill(title)}
              </h2>
              <div className="flex items-center justify-center gap-3 mb-4" aria-hidden="true">
                <span className="h-px w-14" style={{ background: 'linear-gradient(90deg, transparent, #D9A876)' }} />
                <span className="w-1.5 h-1.5 rotate-45 bg-[#D9A876]" />
                <span className="h-px w-14" style={{ background: 'linear-gradient(270deg, transparent, #D9A876)' }} />
              </div>
              <p className="text-[15px] leading-relaxed text-[#F6EBDD]/75 mb-5">{fill(text)}</p>

              {benefits.length > 0 && (
                <ul className="text-left flex flex-col gap-2 mb-6 rounded-[18px] px-4 py-3.5" style={{ background: 'rgba(255,236,208,0.06)', boxShadow: 'inset 0 0 0 1px rgba(217,168,118,0.18)' }}>
                  {benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[#F6EBDD]/85">
                      <Check size={15} className="mt-0.5 shrink-0 text-[#D9A876]" />
                      <span>{fill(b)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col gap-2.5">
                <button
                  ref={primaryRef}
                  type="button"
                  onClick={() => go('login')}
                  className="w-full rounded-full py-3.5 text-[15px] font-semibold text-[#2A1C10] transition-transform active:scale-[0.98] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9A876]"
                  style={{ background: GOLD, boxShadow: '0 10px 30px rgba(217,168,118,0.32), inset 0 1px 0 rgba(255,255,255,0.5)' }}
                >
                  {cfg.loginLabel || 'Login'}
                </button>
                <button
                  type="button"
                  onClick={() => go('signup')}
                  className="w-full rounded-full py-3.5 text-[15px] font-semibold text-[#F3D9B1] transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9A876]"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(217,168,118,0.55)' }}
                >
                  {cfg.signupLabel || 'Create a free account'}
                </button>
                <button type="button" onClick={close} className="mt-1 text-[13px] text-[#F6EBDD]/55 hover:text-[#F6EBDD] py-1.5 transition-colors">
                  {cfg.closeLabel || 'Not now'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
