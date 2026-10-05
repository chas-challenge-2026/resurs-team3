import { createContext } from 'react'
import type { AdminUser, AuthUser, ClientUser } from './types'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  loginAsClient: (params: Omit<ClientUser, 'role'>) => void
  loginAsAdmin: (params: Omit<AdminUser, 'role'>) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
