import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Inverse of ProtectedRoute — for routes like /login that only make sense
// when signed out. An already-authenticated visitor is bounced to "/"
// instead of being shown the login form again.
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth()

  if (state.isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}
