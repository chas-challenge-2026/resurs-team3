import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { WizardPage } from "./WizardPage";
import { CasesProvider } from "../../context/CasesContext";
import { useAuth } from "../../auth/useAuth";
import { createApplication } from "../../features/credit-application/creditApplication.api";
import userEvent from '@testing-library/user-event'
import { waitFor } from '@testing-library/react'
import { saveApplicationDraft } from '../../features/credit-application/applicationDraft'
import type { CreditApplicationData } from '../../features/credit-application/creditApplication.types'

vi.mock("../../auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../features/credit-application/creditApplication.api", async () => {
  const actual = await vi.importActual<
    typeof import("../../features/credit-application/creditApplication.api")
  >("../../features/credit-application/creditApplication.api");

  return {
    ...actual,
    createApplication: vi.fn(),
  };
});

const mockedCreateApplication = vi.mocked(createApplication);

describe("WizardPage API integration", () => {
  it("renders the new wizard for an authenticated company", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        role: "client",
        id: "wizard-api-test",
        orgNumber: "556000-1234",
        companyName: "Göteborg Handel AB",
        authorizedSignatory: "Anna Andersson",
      },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/kreditansokan"]}>
        <CasesProvider>
          <Routes>
            <Route path="/kreditansokan" element={<WizardPage />} />
            <Route path="/kreditansokan/:steg" element={<WizardPage />} />
          </Routes>
        </CasesProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Ansök om företagskredit",
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Nästa" })).toBeInTheDocument();
    expect(mockedCreateApplication).not.toHaveBeenCalled()
  });


it('submits a completed application through the Java API client', async () => {
  Element.prototype.scrollIntoView = vi.fn()
  const user = userEvent.setup()

  const data: CreditApplicationData = {
    orgNumber: '556000-1234',
    companyName: 'Göteborg Handel AB',
    authorizedSignatory: 'Anna Andersson',
    financialYear: '2025',
    industry: 'HANDEL',
    equity: '300000',
    totalCapital: '1000000',
    currentAssets: '500000',
    shortTermLiabilities: '200000',
    longTermLiabilities: '100000',
    operatingProfit: '-5000',
    netSales: '2000000',
    operatingCashFlow: '30000',
    investingCashFlow: '0',
    noCashFlowStatement: '',
    interestExpenses: '0',
    requestedAmount: '250000',
    repaymentTerm: '36',
    purpose: 'Test av API integration',
  }

  localStorage.clear()

  vi.mocked(useAuth).mockReturnValue({
    user: {
      role: 'client',
      id: 'wizard-api-test',
      orgNumber: '556000-1234',
      companyName: 'Göteborg Handel AB',
      authorizedSignatory: 'Anna Andersson',
    },
    isAuthenticated: true,
    loginAsClient: vi.fn(),
    loginAsAdmin: vi.fn(),
    logout: vi.fn(),
  })

  saveApplicationDraft({
    userId: 'wizard-api-test',
    step: 1,
    maxStep: 1,
    data,
  })

  mockedCreateApplication.mockReset()
  mockedCreateApplication.mockResolvedValue({
    applicationId: 42,
    status: 'UNDER_REVIEW',
    decision: 'REVIEW',
    decisionReason: 'Backend test reason',
    flagCount: 2,
    creditScore: 103,
  })

  render(
    <MemoryRouter initialEntries={['/kreditansokan']}>
      <CasesProvider>
        <Routes>
          <Route path="/kreditansokan" element={<WizardPage />} />
          <Route path="/kreditansokan/:steg" element={<WizardPage />} />
          <Route path="/ansokan/42" element={<div>Backend application 42</div>} />
        </Routes>
      </CasesProvider>
    </MemoryRouter>,
  )

  // Wait for the mock company-register check to finish.
  await screen.findByText('Aktivt')

  // Move through the four wizard steps.
  await user.click(screen.getByRole('button', { name: 'Nästa' }))
  await user.click(screen.getByRole('button', { name: 'Nästa' }))
  await user.click(screen.getByRole('button', { name: 'Nästa' }))

  await user.click(screen.getByRole('button', { name: 'Signera med BankID' }))

  // The existing BankID signing flow is simulated.
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: /BankID på den här enheten/ }))
  await user.click(screen.getByRole('button', { name: 'Jag har signerat' }))

  await waitFor(() => {
    expect(mockedCreateApplication).toHaveBeenCalledTimes(1)
  }, { timeout: 2000 })

    expect(mockedCreateApplication).toHaveBeenCalledWith({
      orgNumber: '556000-1234',
      companyName: 'Göteborg Handel AB',
      authorizedSignatory: 'Anna Andersson',
      egetKapital: 300000,
      totaltKapital: 1000000,
      omsattningstillgangar: 500000,
      kortfristigaSkulder: 200000,
      totalaSkulder: 300000,
      rorelseresultat: -5000,
      nettoomsattning: 2000000,
      operativtKassaflode: 30000,
      investeringsKassaflode: 0,
      ranteKostnader: 0,
      bransch: 'HANDEL',
      requestedAmount: 250000,
      purpose: 'Test av API integration',
})

    expect(
    await screen.findByText('Backend application 42'),
     ).toBeInTheDocument()
})

});
