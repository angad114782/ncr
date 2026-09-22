import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, Building2, ChevronDown, ChevronRight, LayoutDashboard, LogOut, MessageCircle, Phone, Plus, ShieldCheck, X } from 'lucide-react'
import ThemeToggle from '../glass/ThemeToggle'
import Avatar from '../common/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

const list = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.18 } } }
const item = { hidden: { opacity: 0, x: 36 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } } }

/**
 * Full-screen off-canvas menu for phones. Slides in from the right, locks the page
 * behind it (html.menu-open → no scrolling), closes on Esc / link / resize and hands
 * focus back to the hamburger. Rendered in a portal because the navbar is a transformed
 * element — a `fixed` child inside it would be sized to the navbar, not the screen.
 */
export default function MobileMenu({ open, onClose, links, onAuthOpen, onAddListing, returnFocusRef }) {
  const { user, isAdmin, isAgent, logout } = useAuth()
  const { whatsappConfig, company, siteContent, fill } = useSettings()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(null)
  const closeRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, []) // portals need document — skip on the server

  // Lock the page behind the menu (CSS in index.css does the actual work).
  useEffect(() => {
    if (!open) return undefined
    document.documentElement.classList.add('menu-open')
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    const mq = window.matchMedia('(min-width: 768px)')
    const onResize = () => mq.matches && onClose()
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onResize)
    return () => {
      document.documentElement.classList.remove('menu-open')
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onResize)
      returnFocusRef?.current?.focus()
    }
  }, [open, onClose, returnFocusRef])

  const digits = whatsappConfig.displayPhone.replace(/\D/g, '')
  const go = (to) => { onClose(); navigate(to) }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label="Main menu">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain bg-base"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
          >
            {/* soft brand glows */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'var(--color-accent)' }} />
              <div className="absolute bottom-10 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20" style={{ background: 'var(--color-accent-2)' }} />
            </div>

            <div className="relative flex items-center justify-between px-5 pt-4 pb-2">
              <Link to="/" onClick={onClose} className="flex items-center gap-2 font-semibold text-lg">
                <span className="w-10 h-10 rounded-[14px] bg-[var(--color-accent)] flex items-center justify-center text-white">
                  <Building2 size={19} />
                </span>
                {company.name}
              </Link>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close menu"
                className="glass-strong w-11 h-11 rounded-full flex items-center justify-center spring active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {user && (
              <button onClick={() => go(isAdmin ? '/admin/profile' : isAgent ? '/agent/profile' : '/dashboard/profile')} className="relative mx-5 mt-3 glass rounded-[20px] p-3 flex items-center gap-3 text-left">
                <Avatar src={user.avatar} name={user.name} className="w-11 h-11 rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">Hi, {user.name.split(' ')[0]}</span>
                  <span className="block text-tertiary text-xs">{isAdmin ? 'Administrator' : isAgent ? 'Property agent' : 'Your account'}</span>
                </span>
                <ChevronRight size={18} className="text-tertiary" />
              </button>
            )}

            <motion.nav className="relative flex-1 px-5 pt-5" variants={list} initial="hidden" animate="show" aria-label="Mobile">
              <ul className="flex flex-col">
                {links.map((l) => {
                  const hasChildren = l.children?.length > 0
                  const isOpen = expanded === l.to
                  return (
                    <motion.li key={l.to} variants={item} className="border-b border-[var(--glass-border)] last:border-0">
                      <div className="flex items-center">
                        <NavLink
                          to={l.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex-1 py-4 text-[26px] leading-none font-semibold tracking-tight flex items-center gap-3 ${isActive ? 'text-[var(--color-accent)]' : ''}`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />}
                              {l.label}
                            </>
                          )}
                        </NavLink>
                        {hasChildren && (
                          <button
                            onClick={() => setExpanded(isOpen ? null : l.to)}
                            aria-label={`${isOpen ? 'Hide' : 'Show'} ${l.label} links`}
                            aria-expanded={isOpen}
                            className="w-11 h-11 rounded-full glass-weak flex items-center justify-center"
                          >
                            <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                      {hasChildren && (
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="overflow-hidden pl-5 pb-3 flex flex-col"
                            >
                              {l.children.map((c) => (
                                <li key={c.label}>
                                  <Link to={c.to} onClick={onClose} className="flex items-center justify-between py-3 text-lg text-secondary active:text-primary">
                                    {c.label} <ChevronRight size={16} className="text-tertiary" />
                                  </Link>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      )}
                    </motion.li>
                  )
                })}
              </ul>
            </motion.nav>

            {/* Actions stay reachable at the bottom of the screen */}
            <div className="sticky bottom-0 mt-6 px-5 pt-4 pb-5 bg-[var(--bg-base)]/85 backdrop-blur-xl border-t border-[var(--glass-border)] flex flex-col gap-3">
              {user ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => go(isAdmin ? '/admin' : isAgent ? '/agent' : '/dashboard')} className="glass-strong rounded-full py-3.5 font-medium flex items-center justify-center gap-2">
                    {isAdmin ? <ShieldCheck size={17} /> : isAgent ? <Briefcase size={17} /> : <LayoutDashboard size={17} />} {isAdmin ? 'Admin' : isAgent ? 'Agent panel' : 'Dashboard'}
                  </button>
                  <button onClick={() => { logout(); onClose(); navigate('/') }} className="glass rounded-full py-3.5 font-medium flex items-center justify-center gap-2 text-[var(--color-danger)]">
                    <LogOut size={17} /> Sign out
                  </button>
                </div>
              ) : (
                <button onClick={() => { onClose(); onAuthOpen() }} className="w-full rounded-full py-4 font-semibold text-white bg-[var(--color-accent)] shadow-[0_8px_24px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] active:scale-[0.98]">
                  Sign In / Create Account
                </button>
              )}

              {onAddListing && (
                <button onClick={() => { onClose(); onAddListing() }} className="w-full rounded-full py-3.5 font-medium glass-strong flex items-center justify-center gap-2">
                  <Plus size={17} /> Add Listing
                </button>
              )}

              {digits && (
                <div className="grid grid-cols-2 gap-3">
                  <a href={`tel:+91${digits}`} className="glass rounded-full py-3 font-medium flex items-center justify-center gap-2">
                    <Phone size={16} className="text-[var(--color-accent)]" /> Call
                  </a>
                  <a
                    href={`https://wa.me/91${digits}?text=${encodeURIComponent(fill(siteContent.contact.waGeneral))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full py-3 font-medium flex items-center justify-center gap-2 text-white"
                    style={{ background: '#25D366' }}
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-secondary px-1">
                <span>Appearance</span>
                <ThemeToggle />
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
