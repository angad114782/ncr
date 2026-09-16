import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`relative glass w-16 h-9 rounded-full flex items-center px-1 spring ${className}`}
    >
      <motion.div
        className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white shadow-md"
        animate={{ x: isDark ? 28 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </motion.div>
    </button>
  )
}
