import React, { createContext, useContext, useMemo, useReducer } from 'react'
import type { AuthState, LoginMethod } from '../types/auth'

const initialState: AuthState = {
  isAuthenticated: false,
  loginMethod: null,
  companyDisplayName: '',
}

type Action =
  | { type: 'LOGIN'; method: LoginMethod; companyDisplayName: string }
  | { type: 'LOGOUT' }

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        isAuthenticated: true,
        loginMethod: action.method,
        companyDisplayName: action.companyDisplayName,
      }
    case 'LOGOUT':
      return { ...initialState }
    default:
      return state
  }
}

interface AuthContextValue {
  state: AuthState
  login: (method: LoginMethod, companyDisplayName: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login: (method, companyDisplayName) => dispatch({ type: 'LOGIN', method, companyDisplayName }),
      logout: () => dispatch({ type: 'LOGOUT' }),
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
