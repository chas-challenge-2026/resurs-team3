import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../auth/AuthContext'
import { BankIdLoginForm } from './BankIdLoginForm'

function renderForm() {
  return render(
    <AuthProvider>
      <BankIdLoginForm />
    </AuthProvider>,
  )
}

describe('BankIdLoginForm', () => {
  it('shows a validation error and does not start BankID for a blank org number', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByLabelText('Organisationsnummer'))
    await user.click(screen.getByRole('button', { name: 'Logga in med BankID' }))

    expect(await screen.findByText('Organisationsnummer måste anges.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a generic error for an org number not in the mock directory', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByLabelText('Organisationsnummer'))
    await user.type(screen.getByLabelText('Organisationsnummer'), '999999-9999')
    await user.click(screen.getByRole('button', { name: 'Logga in med BankID' }))

    expect(
      await screen.findByText('Org.nummer hittades inte eller är inte godkänt för BankID-inloggning.'),
    ).toBeInTheDocument()
  })

  it('shows the pending panel with the matched company for a known org number, and moves focus into it', async () => {
    const user = userEvent.setup()
    renderForm()

    // The field's default value is already a known mock org number.
    await user.click(screen.getByRole('button', { name: 'Logga in med BankID' }))

    const panel = await screen.findByRole('status')
    expect(panel).toHaveTextContent('Göteborg Handel AB')
    // Phase 5 (a11y): focus should land on the panel, not stay on a submit
    // button that no longer exists in the DOM.
    expect(panel).toHaveFocus()
  })

  it('returns focus to the org-number field on cancel', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Logga in med BankID' }))
    await screen.findByRole('status')

    await user.click(screen.getByRole('button', { name: 'Avbryt' }))

    expect(screen.getByLabelText('Organisationsnummer')).toHaveFocus()
  })
})
