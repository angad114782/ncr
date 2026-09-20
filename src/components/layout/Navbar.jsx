import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, Building2, ChevronDown, LayoutDashboard, Menu, ShieldCheck } from 'lucide-react'
import ThemeToggle from '../glass/ThemeToggle'
import GlassButton from '../glass/GlassButton'
import MobileMenu from './MobileMenu'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import Avatar from '../common/Avatar'

export default function Navbar({ onAuthOpen }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const hamburgerRef = useRef(null)
  const { user, isAdmin, isAgent, logout } = useAuth()
  const { siteContent, company } = useSettings()
  // Menu comes from Admin → Site Content → Menu & Footer (hidden items are skipped).
  const links = siteContent.nav.filter((l) => l.visible !== false && l.label)
  const navigate = useNavigate()
  const location = useLocation()
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Always close the mobile menu on navigation, whichever link or action caused it.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className="fixed left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-6xl"
      style={{ top: 'calc(1rem + var(--banner-h, 0px))' }}
    >
      <div
        className={`glass-strong rounded-[24px] px-5 py-3 flex items-center justify-between transition-all ${
          scrolled ? 'shadow-lg' : ''
        }`}
      >
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg shrink-0">
          <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white">
            <Building2 size={18} />
          </span>
          <span className="font-display">{company.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <div
              key={l.to}
              className="relative"
              onMouseEnter={() => (l.children?.length > 0) && setOpenMenu(l.to)}
              onMouseLeave={() => (l.children?.length > 0) && setOpenMenu(null)}
            >
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium spring flex items-center gap-1 ${
                    isActive ? 'glass text-[var(--color-accent)]' : 'text-secondary hover:text-primary'
                  }`
                }
              >
                {l.label}
                {l.children?.length > 0 && (
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${openMenu === l.to ? 'rotate-180' : ''}`}
                  />
                )}
              </NavLink>

              {l.children?.length > 0 && (
                <AnimatePresence>
                  {openMenu === l.to && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="absolute top-full left-0 pt-2 min-w-[190px]"
                    >
                      <div className="glass-strong rounded-[16px] p-2 flex flex-col gap-0.5">
                        {l.children.map((c) => (
                          <Link
                            key={c.label}
                            to={c.to}
                            className="px-3 py-2.5 rounded-[10px] text-sm text-secondary hover:text-primary hover:bg-[var(--glass-surface-weak)] spring"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <GlassButton variant="glass" size="sm" icon={ShieldCheck} onClick={() => navigate('/admin')}>
                  Admin
                </GlassButton>
              )}
              {isAgent && (
                <GlassButton variant="glass" size="sm" icon={Briefcase} onClick={() => navigate('/agent')}>
                  Agent panel
                </GlassButton>
              )}
              <GlassButton variant="glass" size="sm" icon={LayoutDashboard} onClick={() => navigate('/dashboard')}>
                Dashboard
              </GlassButton>
              <button onClick={logout} aria-label="Sign out" className="w-10 h-10 rounded-full overflow-hidden glass spring hover:scale-105">
                <Avatar src={user.avatar} name={user.name} className="w-full h-full" />
              </button>
            </div>
          ) : (
            <GlassButton size="sm" onClick={onAuthOpen}>
              Sign In
            </GlassButton>
          )}
        </div>

        <button
          ref={hamburgerRef}
          className="md:hidden glass w-11 h-11 rounded-full flex items-center justify-center spring active:scale-90"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
        >
          <Menu size={20} />
        </button>
      </div>

      <MobileMenu open={mobileOpen} onClose={closeMobile} links={links} onAuthOpen={onAuthOpen} returnFocusRef={hamburgerRef} />
    </motion.header>
  )
}
