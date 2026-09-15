import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/Icon";
import { useCases } from "../../context/useCases";
import type { CreditCase, ApplicationStatus } from "../../types/case";
import { CompanyDetailsStep } from "../../features/credit-application/steps/CompanyDetailsStep";
import { FinancialMetricsStep } from "../../features/credit-application/steps/FinancialMetricsStep";
import { CreditDetailsStep } from "../../features/credit-application/steps/CreditDetailsStep";
import type { CreditApplicationData } from "../../features/credit-application/creditApplication.types";
import {
  validateCompanyDetails,
  type CompanyDetailsErrors,
} from "../../features/credit-application/companyDetails.validation";
import { toCaseSubmission } from "../../features/credit-application/creditApplication.mapper";
import { WizardTopBar } from "./WizardTopBar";
import { StepTabs } from "./StepTabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/Dialog";
import { joinClassNames } from "../../lib/joinClassNames";
import styles from "./WizardPage.module.css";

const TOTAL_STEPS = 3;

const initialApplicationData: CreditApplicationData = {
  orgNumber: "",
  companyName: "",
  authorizedSignatory: "",
  equity: "",
  totalCapital: "",
  currentAssets: "",
  shortTermLiabilities: "",
  totalDebt: "",
  operatingProfit: "",
  netSales: "",
  requestedAmount: "",
  purpose: "",
};

// Same outcome copy the other project's Step4Confirmation shows — the case
// is scored synchronously by useCases().addCase (utils/scoring.ts), so the
// confirmation screen can show the real decision instead of a generic
// "we'll review it" message.
const OUTCOME_COPY: Record<
  ApplicationStatus,
  { heading: string; body: string }
> = {
  APPROVED: {
    heading: "Ansökan godkänd",
    body: "Grattis! Er kreditansökan har godkänts automatiskt baserat på era finansiella nyckeltal. Beslutet är slutgiltigt och kräver ingen ytterligare handläggning.",
  },
  REJECTED: {
    heading: "Ansökan avslagen",
    body: "Er kreditansökan kunde tyvärr inte godkännas baserat på de inlämnade finansiella nyckeltalen. Se motiveringen nedan för detaljer.",
  },
  UNDER_REVIEW: {
    heading: "Ansökan under granskning",
    body: "Er ansökan kräver manuell granskning av en handläggare innan ett slutgiltigt beslut kan fattas. Ni meddelas när beslut har fattats.",
  },
  PENDING_DOCS: {
    heading: "Ansökan mottagen",
    body: "Er ansökan har tagits emot och väntar på komplettering.",
  },
};

const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  APPROVED: styles.statusApproved,
  REJECTED: styles.statusRejected,
  UNDER_REVIEW: styles.statusUnderReview,
  PENDING_DOCS: styles.statusPendingDocs,
};

/**
 * The applicant-facing credit application flow. The step chrome (top bar,
 * step tabs, panel) is carried over from the resurs-direkt-app wireframes;
 * the field logic underneath is unchanged from features/credit-application —
 * one flat useState instead of that project's ApplicationContext/reducer.
 *
 * Submitting now mirrors the other project's wiring too: addCase() (from
 * CasesContext) runs the same ScoringService the backoffice queue trusts
 * and drops the resulting case straight into it, so a submitted application
 * shows up in the caseworker dashboard exactly like a real POST /apply would.
 */
export function WizardPage() {
  const { addCase } = useCases();
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState<CreditApplicationData>(
    initialApplicationData,
  );
  const [companyDetailsErrors, setCompanyDetailsErrors] =
    useState<CompanyDetailsErrors>({});

  const [companyValidationActive, setCompanyValidationActive] = useState(false);
  const [submittedCase, setSubmittedCase] = useState<CreditCase | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleChange(field: keyof CreditApplicationData, value: string) {
    const updatedData = {
      ...applicationData,
      [field]: value,
    };

    setApplicationData(updatedData);

    if (companyValidationActive && currentStep === 1) {
      setCompanyDetailsErrors(validateCompanyDetails(updatedData));
    }
  }

  function goToStep(step: number) {
    if (step <= currentStep) setCurrentStep(step);
  }

  function goToNextStep() {
    if (currentStep === 1) {
      const errors = validateCompanyDetails(applicationData);

      setCompanyValidationActive(true);
      setCompanyDetailsErrors(errors);

      if (Object.keys(errors).length > 0) {
        return;
      }
    }

    setCurrentStep((step) => Math.min(step + 1, TOTAL_STEPS));
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 1));
  }

  function handleSubmit() {
    const { companyInfo, financials, creditRequest } =
      toCaseSubmission(applicationData);
    const createdCase = addCase(companyInfo, financials, creditRequest);
    setSubmittedCase(createdCase);
  }

  function handleConfirmSubmit() {
    handleSubmit();
    setConfirmOpen(false);
  }

function handleRestart() {
  setApplicationData(initialApplicationData)
  setCurrentStep(1)
  setSubmittedCase(null)
  setCompanyDetailsErrors({})
  setCompanyValidationActive(false)
}

  return (
    <div>
      <WizardTopBar title="Ny kreditansökan" />

      <div className={styles.stepTabsWrap}>
        <StepTabs currentStep={currentStep} onSelectStep={goToStep} />
      </div>

      <div className={styles.panel}>
        {submittedCase ? (
          <div>
            <div className={styles.outcomeHeadingRow}>
              <h2 className={styles.outcomeHeading}>
                {OUTCOME_COPY[submittedCase.status].heading}
              </h2>
              <span
                className={joinClassNames(
                  styles.statusBadge,
                  STATUS_BADGE_CLASS[submittedCase.status],
                )}
              >
                {submittedCase.status}
              </span>
            </div>
            <p className={styles.outcomeBody}>
              Tack, {applicationData.companyName || "kund"}.{" "}
              {OUTCOME_COPY[submittedCase.status].body}
            </p>

            <div className={styles.reasonPanel}>
              <p className={styles.reasonLabel}>
                Motivering från kreditbedömningen
              </p>
              <p className={styles.reasonText}>
                {submittedCase.scoringResult.decisionReason}
              </p>
            </div>

            <div className={styles.restartWrap}>
              <Button type="button" variant="secondary" onClick={handleRestart}>
                Starta ny ansökan
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.formWrap}>
            {currentStep === 1 ? (
              <CompanyDetailsStep
                data={applicationData}
                errors={companyDetailsErrors}
                onChange={handleChange}
              />
            ) : null}
            {currentStep === 2 ? (
              <FinancialMetricsStep
                data={applicationData}
                onChange={handleChange}
              />
            ) : null}
            {currentStep === 3 ? (
              <CreditDetailsStep
                data={applicationData}
                onChange={handleChange}
              />
            ) : null}

            <div className={styles.actionsRow}>
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={goToPreviousStep}
                  icon={<Icon name="arrow-left" />}
                >
                  Tillbaka
                </Button>
              ) : null}

              {currentStep < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={goToNextStep}
                  icon={<Icon name="arrow-right" />}
                >
                  Nästa
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  icon={<Icon name="arrow-right" />}
                >
                  Skicka in ansökan
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekräfta ansökan</DialogTitle>
            <DialogDescription>
              Kontrollera uppgifterna innan ansökan skickas in. Ansökan bedöms
              automatiskt baserat på de finansiella uppgifterna.
            </DialogDescription>
          </DialogHeader>

          <dl className={styles.confirmSummary}>
            <div className={styles.confirmRow}>
              <dt>Företag</dt>
              <dd>{applicationData.companyName || "\u2014"}</dd>
            </div>
            <div className={styles.confirmRow}>
              <dt>Organisationsnummer</dt>
              <dd>{applicationData.orgNumber || "\u2014"}</dd>
            </div>
            <div className={styles.confirmRow}>
              <dt>Begärt belopp</dt>
              <dd>
                {applicationData.requestedAmount
                  ? `${applicationData.requestedAmount} SEK`
                  : "\u2014"}
              </dd>
            </div>
          </dl>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
            >
              Avbryt
            </Button>
            <Button type="button" onClick={handleConfirmSubmit}>
              Skicka in ansökan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
