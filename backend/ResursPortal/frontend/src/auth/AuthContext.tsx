import { useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { AdminUser, AuthUser, ClientUser } from './types'
import { AuthContext } from './auth-context'
import {
  SESSION_IDLE_TIMEOUT_MS,
  clearMockSession,
  loadMockSession,
  saveMockSession,
} from './session'

interface State {
  user: AuthUser | null
}

type Action = { type: 'LOGIN'; user: AuthUser } | { type: 'LOGOUT' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOGIN':
      return { user: action.user }
    case 'LOGOUT':
      return { user: null }
    default:
      return state
  }
}

// Events that reset the idle timer below. `mousemove` is deliberately left
// out — it fires on tiny cursor twitches, so including it would mean the
// timer almost never actually expires.
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: runs once, before the first render, so the restored
  // session is already in state up front — no "checking session..." flash.
  // Only works because restoring here is a synchronous sessionStorage read.
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    user: loadMockSession(),
  }))

  const value = useMemo(() => {
    function login(user: AuthUser) {
      saveMockSession(user)
      dispatch({ type: 'LOGIN', user })
    }

    return {
      user: state.user,
      isAuthenticated: state.user !== null,
      loginAsClient: (params: Omit<ClientUser, 'role'>) => login({ role: 'client', ...params }),
      loginAsAdmin: (params: Omit<AdminUser, 'role'>) => login({ role: 'admin', ...params }),
      logout: () => {
        clearMockSession()
        dispatch({ type: 'LOGOUT' })
      },
    }
  }, [state])

  // Phase 4: mock idle-session timeout, standing in for the backend's
  // HttpSession expiry. Logs out after SESSION_IDLE_TIMEOUT_MS of no
  // activity; resetTimer restarts the countdown on each qualifying event.
  useEffect(() => {
    if (!state.user) return

    let timeoutId: ReturnType<typeof setTimeout>

    function handleIdleTimeout() {
      clearMockSession()
      dispatch({ type: 'LOGOUT' })
    }

    function resetTimer() {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleIdleTimeout, SESSION_IDLE_TIMEOUT_MS)
    }

    resetTimer()
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer))

    return () => {
      clearTimeout(timeoutId)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [state.user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
