import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { UserRole } from './types'
import { ROUTES } from '../routes'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

/**
 * Guards a route behind AuthContext. With no allowedRoles, any signed-in
 * user passes — same as before. With allowedRoles, a signed-in user with
 * the wrong role is sent to "/" (their own home) rather than back to
 * /login, since they *are* authenticated, just not allowed here.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
