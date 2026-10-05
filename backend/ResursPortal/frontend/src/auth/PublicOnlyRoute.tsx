import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

// Inverse of ProtectedRoute — for routes like /login that only make sense
// when signed out. An already-authenticated visitor is bounced to "/"
// instead of being shown the login form again.
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}
