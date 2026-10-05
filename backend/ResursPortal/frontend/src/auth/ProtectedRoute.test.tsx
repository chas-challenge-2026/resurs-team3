import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from './useAuth'
import type { UserRole } from './types'

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }))

const mockedUseAuth = vi.mocked(useAuth)

function renderProtected(allowedRoles?: UserRole[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    })

    renderProtected()

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders the protected content when authenticated and no allowedRoles is set', () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'client', id: '1', orgNumber: '556000-1234', companyName: 'Göteborg Handel AB' },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    })

    renderProtected()

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders the content when the user role is in allowedRoles', () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'admin', id: '1', name: 'Karin', email: 'karin@resurs.se' },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    })

    renderProtected(['admin'])

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to / (not /login) when authenticated but the role is not in allowedRoles', () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'client', id: '1', orgNumber: '556000-1234', companyName: 'Göteborg Handel AB' },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    })

    renderProtected(['admin'])

    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
