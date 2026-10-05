import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../auth/AuthContext'
import { LoginPage } from './LoginPage'

// Phase 5 (a11y): the tab row follows the WAI-ARIA APG tabs pattern —
// role="tablist"/"tab"/"tabpanel", aria-selected, and arrow-key navigation
// with automatic activation. These tests exercise that contract directly
// rather than just the visual "which form is showing" behavior.
//
// LoginPage now opens on an intro screen (logo + pitch copy + a "Kom
// igång" CTA) before the tabbed login layout appears, so every test here
// clicks through that CTA first — these tests are specifically about the
// tab contract, not the intro step.
async function renderLoginPage() {
  const user = userEvent.setup()
  render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  )
  await user.click(screen.getByRole('button', { name: 'Kom igång' }))
  return user
}

describe('LoginPage tabs', () => {
  it('starts on the BankID tab, selected and showing the org-number field', async () => {
    await renderLoginPage()

    expect(screen.getByRole('tab', { name: 'Företagsinloggning' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Handläggare' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByLabelText('Organisationsnummer')).toBeInTheDocument()
  })

  it('clicking the Handläggare tab switches the selection and the panel content', async () => {
    const user = await renderLoginPage()

    await user.click(screen.getByRole('tab', { name: 'Handläggare' }))

    expect(screen.getByRole('tab', { name: 'Handläggare' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('E-postadress')).toBeInTheDocument()
    expect(screen.queryByLabelText('Organisationsnummer')).not.toBeInTheDocument()
  })

  it('ArrowRight moves both focus and selection to the next tab', async () => {
    const user = await renderLoginPage()

    const bankIdTab = screen.getByRole('tab', { name: 'Företagsinloggning' })
    bankIdTab.focus()
    await user.keyboard('{ArrowRight}')

    const handlaggareTab = screen.getByRole('tab', { name: 'Handläggare' })
    expect(handlaggareTab).toHaveAttribute('aria-selected', 'true')
    expect(handlaggareTab).toHaveFocus()
  })

  it('ArrowLeft from the first tab wraps around to the last tab', async () => {
    const user = await renderLoginPage()

    const bankIdTab = screen.getByRole('tab', { name: 'Företagsinloggning' })
    bankIdTab.focus()
    await user.keyboard('{ArrowLeft}')

    const handlaggareTab = screen.getByRole('tab', { name: 'Handläggare' })
    expect(handlaggareTab).toHaveAttribute('aria-selected', 'true')
    expect(handlaggareTab).toHaveFocus()
  })

  it('only the active tab is in the Tab order (roving tabindex)', async () => {
    await renderLoginPage()

    expect(screen.getByRole('tab', { name: 'Företagsinloggning' })).toHaveAttribute('tabIndex', '0')
    expect(screen.getByRole('tab', { name: 'Handläggare' })).toHaveAttribute('tabIndex', '-1')
  })

  it('the tabpanel is labelled by the currently active tab', async () => {
    await renderLoginPage()

    const activeTab = screen.getByRole('tab', { name: 'Företagsinloggning' })
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute('aria-labelledby', activeTab.id)
  })
})
