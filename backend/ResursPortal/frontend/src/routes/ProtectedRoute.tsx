import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

// Guards a route behind AuthContext's isAuthenticated flag. As soon as a
// case-worker-only or company-only view exists, this is also the place to
// branch on loginMethod — for now it's just "signed in at all".
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth()

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
