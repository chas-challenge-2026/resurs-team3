import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { useAuth } from './useAuth'

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }))

const mockedUseAuth = vi.mocked(useAuth)

function renderPublicOnly() {
  return render(
    <MemoryRouter initialEntries={['/logga-in']}>
      <Routes>
        <Route path="/" element={<div>Home Page</div>} />
        <Route
          path="/logga-in"
          element={
            <PublicOnlyRoute>
              <div>Login Form</div>
            </PublicOnlyRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicOnlyRoute', () => {
  it('renders the children when not authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    })

    renderPublicOnly()

    expect(screen.getByText('Login Form')).toBeInTheDocument()
  })

  it('redirects to / when already authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'admin', id: '1', name: 'Karin', email: 'karin@resurs.se' },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    })

    renderPublicOnly()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument()
  })
})
