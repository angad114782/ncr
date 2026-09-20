import { Navigate } from 'react-router-dom'
import { panelPath, useAuth } from '../../context/AuthContext'

/**
 * Keeps signed-out visitors away from panels. `roles` (e.g. ['agent']) limits a panel to those
 * accounts; anyone else is sent to their own panel. `requireAdmin` is shorthand for roles={['admin']}.
 */
export default function ProtectedRoute({ children, requireAdmin = false, roles }) {
  const { user, ready } = useAuth()
  const allowed = requireAdmin ? ['admin'] : roles

  // The saved session is read right after the first render — don't bounce a signed-in
  // visitor to the home page before it has been loaded.
  if (!ready) return null
  if (!user) return <Navigate to="/" replace />
  if (allowed && !allowed.includes(user.role)) return <Navigate to={panelPath(user)} replace />

  return children
}
