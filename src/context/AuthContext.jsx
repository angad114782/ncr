import { createContext, useContext, useEffect, useState } from 'react'
import usersData from '../data/users.json'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('re-user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [extraUsers, setExtraUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('re-extra-users')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Per-user profile edits (name/phone/city/avatar), keyed by user id.
  // Needed because the two seed accounts (admin/kabir) come from a static
  // JSON import that can't be mutated directly — this is the persisted
  // "patch" layer applied on top of it (and on top of extraUsers) whenever
  // a user is looked up or listed.
  const [overrides, setOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('re-user-overrides')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      if (user) localStorage.setItem('re-user', JSON.stringify(user))
      else localStorage.removeItem('re-user')
    } catch {
      /* ignore */
    }
  }, [user])

  useEffect(() => {
    try {
      localStorage.setItem('re-extra-users', JSON.stringify(extraUsers))
    } catch {
      /* ignore */
    }
  }, [extraUsers])

  useEffect(() => {
    try {
      localStorage.setItem('re-user-overrides', JSON.stringify(overrides))
    } catch {
      /* ignore */
    }
  }, [overrides])

  const withOverrides = (u) => (u && overrides[u.id] ? { ...u, ...overrides[u.id] } : u)

  const allUsers = [...usersData, ...extraUsers].map(withOverrides)
  const findByPhone = (phone) => allUsers.find((u) => u.phone === phone)

  const loginWithPhone = (phone) => {
    const found = findByPhone(phone)
    if (!found) {
      return { ok: false, error: "No account found with this number. Let's sign you up instead." }
    }
    setUser(found)
    return { ok: true, user: found }
  }

  const signupWithPhone = (name, phone) => {
    if (findByPhone(phone)) {
      return { ok: false, error: 'An account with this number already exists. Please login instead.' }
    }
    const newUser = {
      id: `u${Date.now()}`,
      name,
      phone,
      role: 'user',
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(phone)}`,
      city: 'Mumbai',
    }
    setExtraUsers((prev) => [...prev, newUser])
    setUser(newUser)
    return { ok: true, user: newUser }
  }

  const updateProfile = (patch) => {
    if (!user) return { ok: false, error: 'Not signed in.' }

    if (patch.phone && patch.phone !== user.phone) {
      if (!/^\d{10}$/.test(patch.phone)) {
        return { ok: false, error: 'Enter a valid 10-digit mobile number.' }
      }
      const clash = allUsers.find((u) => u.phone === patch.phone && u.id !== user.id)
      if (clash) {
        return { ok: false, error: 'This number is already linked to another account.' }
      }
    }

    setOverrides((prev) => ({ ...prev, [user.id]: { ...prev[user.id], ...patch } }))
    setUser((prev) => ({ ...prev, ...patch }))
    return { ok: true }
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        loginWithPhone,
        signupWithPhone,
        updateProfile,
        findByPhone,
        logout,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
