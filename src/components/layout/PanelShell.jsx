import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, LogOut } from 'lucide-react'
import ThemeToggle from '../glass/ThemeToggle'
import ContactRail from './ContactRail'
import ApiToast from './ApiToast'
import Seo from './Seo'
import { useStorageErrors } from '../../utils/storageStatus'
import { useSettings } from '../../context/SettingsContext'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'

export default function PanelShell({ title, navItems }) {
  const { user, isAdmin, isAgent, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { company } = useSettings()
  const storageErrors = useStorageErrors()
  const profilePath = isAdmin ? '/admin/profile' : isAgent ? '/agent/profile' : '/dashboard/profile'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex bg-base">
      <Seo title={title} path={pathname} noindex />
      <motion.aside
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="hidden md:flex flex-col w-72 p-6 gap-6 sticky top-0 h-screen"
      >
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white">
            <Building2 size={18} />
          </span>
          {company.name}
        </Link>

        <Link to={profilePath} className="glass rounded-[20px] p-4 flex items-center gap-3 spring hover:scale-[1.02]">
          <Avatar src={user?.avatar} name={user?.name} className="w-11 h-11 rounded-full" />
          <div className="min-w-0">
            <p className="font-medium truncate">{user?.name}</p>
            <p className="text-tertiary text-xs truncate">{user?.phone ? `+91 ${user.phone}` : user?.email}</p>
          </div>
        </Link>

        <nav className="glass rounded-[20px] p-2 flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto">
          <p className="text-tertiary text-xs font-semibold uppercase tracking-wide px-4 pt-3 pb-1">{title}</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-medium spring ${
                  isActive ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary hover:text-primary'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between px-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="glass w-10 h-10 rounded-full flex items-center justify-center spring hover:scale-105 text-[var(--color-danger)]"
          >
            <LogOut size={16} />
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 min-w-0">
        <MobileTabBar navItems={navItems} onLogout={handleLogout} brand={company.name} />
        <main className="p-4 md:p-8 pb-28 md:pb-8 max-w-6xl mx-auto">
          {storageErrors.length > 0 && (
            <div role="alert" className="glass-strong rounded-[18px] p-4 mb-6 text-sm border border-[var(--color-danger)]">
              <p className="font-semibold text-[var(--color-danger)]">Browser storage is full — recent changes are NOT being saved.</p>
              <p className="text-secondary mt-1">Uploaded images take a lot of space. Delete some uploads, switch to image links, and download a backup (Site Content → Backup & reset).</p>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <ContactRail showMobileBar={false} />
      <ApiToast />
    </div>
  )
}

function MobileTabBar({ navItems, onLogout, brand }) {
  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="w-8 h-8 rounded-[10px] bg-[var(--color-accent)] flex items-center justify-center text-white">
            <Building2 size={16} />
          </span>
          {brand}
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 glass-strong rounded-full px-2 py-2 flex items-center gap-1 max-w-[94vw] overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `w-11 h-11 shrink-0 rounded-full flex items-center justify-center spring ${
                isActive ? 'glass text-[var(--color-accent)]' : 'text-secondary'
              }`
            }
          >
            <item.icon size={18} />
          </NavLink>
        ))}
        <button onClick={onLogout} className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--color-danger)]">
          <LogOut size={16} />
        </button>
      </nav>
    </>
  )
}
