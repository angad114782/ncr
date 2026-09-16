import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAdmin } = useAuth()

  if (!user) return <Navigate to="/" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />

  return children
}
