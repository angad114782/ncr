import { createContext, useContext, useEffect } from 'react'
import usePersistedState from '../hooks/usePersistedState'
import usersData from '../data/users.json'

const AuthContext = createContext(null)

/** Where each kind of account lands after signing in. */
export const panelPath = (user) => (user?.role === 'admin' ? '/admin' : user?.role === 'agent' ? '/agent' : '/dashboard')

export function AuthProvider({ children }) {
  // The very first render uses the defaults (no user) so pre-rendered HTML and the first
  // client render match; the saved session is loaded before the browser paints.
  // `ready` tells route guards to wait for that instead of bouncing a signed-in user away.
  const [user, setUser, ready] = usePersistedState('re-user', null)
  const [extraUsers, setExtraUsers] = usePersistedState('re-extra-users', [])
  // Per-user profile edits (name/phone/city/avatar), keyed by user id. The seed accounts come
  // from a static JSON import that can't be mutated, so edits are stored as a patch that is
  // applied on top of it (and on top of extraUsers) whenever a user is looked up or listed.
  const [overrides, setOverrides] = usePersistedState('re-user-overrides', {})

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

  // role 'user' (client, the default) or 'agent'. An agent also gets a pending agent record — the
  // caller (AuthSheet) creates it in DataContext, keyed by the `agentId` returned here.
  const signupWithPhone = (name, phone, { role = 'user', city = '' } = {}) => {
    if (findByPhone(phone)) {
      return { ok: false, error: 'An account with this number already exists. Please login instead.' }
    }
    const newUser = {
      id: `u${Date.now()}`,
      name,
      phone,
      role: role === 'agent' ? 'agent' : 'user',
      avatar: '',
      city: city || (role === 'agent' ? '' : 'Mumbai'),
    }
    if (newUser.role === 'agent') newUser.agentId = `a${newUser.id}`
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
    const wouldLoseAdmin = target?.role === 'admin' && ((patch.role !== undefined && patch.role !== 'admin') || patch.active === false)
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
        ready,
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
        isAgent: user?.role === 'agent',
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
