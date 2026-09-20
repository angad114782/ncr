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

  // A deactivated account is signed out immediately, even if it is currently logged in.
  useEffect(() => {
    if (user && overrides[user.id]?.active === false) setUser(null)
  }, [user, overrides])

  const withOverrides = (u) => (u && overrides[u.id] ? { ...u, ...overrides[u.id] } : u)

  const allUsers = [...usersData, ...extraUsers].map(withOverrides)
  const findByPhone = (phone) => allUsers.find((u) => u.phone === phone)

  const loginWithPhone = (phone) => {
    const found = findByPhone(phone)
    if (!found) {
      return { ok: false, error: "No account found with this number. Let's sign you up instead." }
    }
    if (found.active === false) {
      return { ok: false, error: 'This account has been deactivated. Please contact support.' }
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

  // ---- Admin user management -------------------------------------------------
  const validatePhone = (phone, ignoreId) => {
    if (!/^\d{10}$/.test(phone)) return 'Enter a valid 10-digit mobile number.'
    if (allUsers.some((u) => u.phone === phone && u.id !== ignoreId)) return 'This number is already linked to another account.'
    return ''
  }

  const addUser = ({ name, phone, city = '', role = 'user' }) => {
    if (String(name ?? '').trim().length < 2) return { ok: false, error: 'Please enter a name.' }
    const error = validatePhone(phone)
    if (error) return { ok: false, error }
    const newUser = {
      id: `u${Date.now().toString(36)}`,
      name: name.trim(),
      phone,
      role,
      city,
      active: true,
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(phone)}`,
    }
    setExtraUsers((prev) => [...prev, newUser])
    return { ok: true, user: newUser }
  }

  const updateUserById = (id, patch) => {
    if (patch.phone !== undefined) {
      const error = validatePhone(patch.phone, id)
      if (error) return { ok: false, error }
    }
    if (patch.name !== undefined && String(patch.name).trim().length < 2) return { ok: false, error: 'Please enter a name.' }
    // Never let the last active admin be demoted or deactivated (would lock everyone out).
    const target = allUsers.find((u) => u.id === id)
    const wouldLoseAdmin = target?.role === 'admin' && (patch.role === 'user' || patch.active === false)
    if (wouldLoseAdmin && allUsers.filter((u) => u.role === 'admin' && u.active !== false).length <= 1) {
      return { ok: false, error: 'At least one active admin is required.' }
    }
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
    if (user?.id === id) setUser((prev) => ({ ...prev, ...patch }))
    return { ok: true }
  }

  const setUserActive = (id, active) => updateUserById(id, { active })

  // Seed accounts can only be deactivated; accounts created at runtime can be deleted.
  const deleteUser = (id) => {
    if (id === user?.id) return { ok: false, error: 'You cannot delete the account you are signed in with.' }
    if (!extraUsers.some((u) => u.id === id)) return { ok: false, error: 'Built-in accounts can only be deactivated.' }
    setExtraUsers((prev) => prev.filter((u) => u.id !== id))
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
        addUser,
        updateUserById,
        setUserActive,
        deleteUser,
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
