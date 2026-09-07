import { useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { AuthState, LoginMethod } from '../types/auth'
import { AuthContext } from './auth-context'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo(
    () => ({
      state,
      login: (method: LoginMethod, companyDisplayName: string) =>
        dispatch({ type: 'LOGIN', method, companyDisplayName }),
      logout: () => dispatch({ type: 'LOGOUT' }),
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
