import { createContext } from 'react'
import type { AuthState, LoginMethod } from '../types/auth'

export interface AuthContextValue {
  state: AuthState
  login: (method: LoginMethod, companyDisplayName: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
