import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, LogOut } from 'lucide-react'
import ThemeToggle from '../glass/ThemeToggle'
import ContactRail from './ContactRail'
import { useAuth } from '../../context/AuthContext'

export default function PanelShell({ title, navItems }) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const profilePath = isAdmin ? '/admin/profile' : '/dashboard/profile'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex bg-base">
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
          NCR Estates
        </Link>

        <Link to={profilePath} className="glass rounded-[20px] p-4 flex items-center gap-3 spring hover:scale-[1.02]">
          <img src={user?.avatar} alt={user?.name} className="w-11 h-11 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="font-medium truncate">{user?.name}</p>
            <p className="text-tertiary text-xs truncate">{user?.phone ? `+91 ${user.phone}` : user?.email}</p>
          </div>
        </Link>

        <nav className="glass rounded-[20px] p-2 flex flex-col gap-1 flex-1">
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
        <MobileTabBar navItems={navItems} onLogout={handleLogout} />
        <main className="p-4 md:p-8 pb-28 md:pb-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>

      <ContactRail showMobileBar={false} />
    </div>
  )
}

function MobileTabBar({ navItems, onLogout }) {
  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="w-8 h-8 rounded-[10px] bg-[var(--color-accent)] flex items-center justify-center text-white">
            <Building2 size={16} />
          </span>
          NCR Estates
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 glass-strong rounded-full px-2 py-2 flex items-center gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `w-11 h-11 rounded-full flex items-center justify-center spring ${
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
