import { createContext, useContext, useEffect, useState } from 'react'
import { useIsoLayoutEffect } from '../hooks/usePersistedState'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  // First render = 'light' on the server and in the browser (matching HTML). The saved / system
  // choice is applied before paint by the tiny inline script in index.html (no flash) and read
  // here in a layout effect so the toggle icon is right.
  const [theme, setTheme] = useState('light')
  const [ready, setReady] = useState(false)

  useIsoLayoutEffect(() => {
    try {
      const saved = localStorage.getItem('re-theme')
      setTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
    } catch {
      /* keep light */
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('re-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme, ready])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
