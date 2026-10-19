
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OverviewPage } from './OverviewPage'
import { CasesProvider } from '../../context/CasesContext'
import { useAuth } from '../../auth/useAuth'

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

function mockCompany(orgNumber: string, companyName: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      role: 'client',
      id: orgNumber,
      orgNumber,
      companyName,
    },
    isAuthenticated: true,
    loginAsClient: vi.fn(),
    loginAsAdmin: vi.fn(),
    logout: vi.fn(),
  })
}

function renderOverview() {
  return render(
    <MemoryRouter>
      <CasesProvider>
        <OverviewPage />
      </CasesProvider>
    </MemoryRouter>,
  )
}

describe('OverviewPage prototype baseline', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows the matching company prototype application', () => {
    mockCompany('556000-5678', 'Göteborg Handel AB')

    renderOverview()

    expect(
      screen.getByRole('heading', { name: 'Mina ansökningar' }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Ansökan C-1001' }),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('link', { name: 'Ansökan C-1002' }),
    ).not.toBeInTheDocument()
  })

  it('shows the empty state for a company without prototype applications', () => {
    mockCompany('556000-1234', 'Malmö Fastigheter AB')

    renderOverview()

    expect(
      screen.getByRole('heading', { name: 'Inga ansökningar ännu' }),
    ).toBeInTheDocument()
  })

it('does not show another company application when only the name matches', () => {
  mockCompany('556999-9999', 'Göteborg Handel AB')

  renderOverview()

  expect(
    screen.queryByRole('link', {
      name: 'Ansökan C-1001',
    }),
  ).not.toBeInTheDocument()

  expect(
    screen.getByRole('heading', {
      name: 'Inga ansökningar ännu',
    }),
  ).toBeInTheDocument()
})

})
