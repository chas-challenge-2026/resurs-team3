import { useEffect, useRef, useState } from 'react'
import type { CreditCase, ScoringSeverity } from '../../types/case'
import type { Decision } from '../../context/cases-context'
import { AUDIT_ACTION_LABELS } from '../../utils/audit'
import { formatDate, formatDateTime, formatSEK, swedishDecimals } from '../../utils/format'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/Dialog'
import styles from './CaseReviewPanel.module.css'
import { joinClassNames } from '../../lib/joinClassNames'

const COMMENT_MAX = 1000
/** Approving against a reject recommendation needs a fuller justification. */
const OVERRIDE_MIN = 40

const REGISTRATION_LABEL = {
  ACTIVE: 'Aktivt',
  INACTIVE: 'Avregistrerat',
  UNDER_LIQUIDATION: 'Under likvidation',
  NOT_FOUND: 'Hittades inte',
} as const

interface CaseReviewPanelProps {
  application: CreditCase
  onDecision?: (id: string, status: Decision, comment: string) => boolean
  /** Move focus to the case heading on mount (set after a decision auto-advances the queue). */
  focusOnMount?: boolean
}

const STATUS_LABEL = {
  PENDING_DOCS: 'Komplettering krävs',
  UNDER_REVIEW: 'Under granskning',
  APPROVED: 'Beviljad',
  REJECTED: 'Avslagen',
} as const

const SEVERITY_LABEL: Record<ScoringSeverity, string> = {
  good: 'Bra',
  ok: 'Inom gräns',
  flagged: 'Kontrollera',
  reject: 'Avvikelse',
}

const FINANCIAL_FIELDS = [
  ['Nettoomsättning', 'netRevenue'],
  ['Eget kapital', 'equity'],
  ['Balansomslutning', 'totalCapital'],
  ['Omsättningstillgångar', 'currentAssets'],
  ['Kortfristiga skulder', 'currentLiabilities'],
  ['Totala skulder', 'totalLiabilities'],
  ['Rörelseresultat', 'operatingProfit'],
  ['Operativt kassaflöde', 'operatingCashFlow'],
  ['Investeringskassaflöde', 'investingCashFlow'],
  ['Räntekostnader', 'interestExpenses'],
] as const

function displayFinancialValue(value: string) {
  if (!value.trim()) return 'Ej angivet'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? formatSEK(numeric) : value
}

function formatMetric(value: number, key?: string) {
  // A missing value is said as missing, never shown as 0.
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  // Rörelsemarginal reads as a percentage (as in the scoring log); the other
  // ratios are plain ratios.
  if (key === 'rorelsemarginal') return `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value * 100)} %`
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value)
}

function decisionLabel(status: Decision, override = false) {
  if (override) return status === 'APPROVED' ? 'Ändra till beviljad' : 'Ändra till avslag'
  return status === 'APPROVED' ? 'Bevilja ansökan' : 'Avslå ansökan'
}

function auditDecisionLabel(value: string) {
  if (value === 'APPROVED') return 'Beviljad'
  if (value === 'REJECTED') return 'Avslagen'
  if (value === 'REVIEW') return 'Manuell granskning'
  return value
}

// Render with key={application.id}: each case gets its own empty comment,
// so a justification can never carry over to the next case.
export function CaseReviewPanel({ application, onDecision, focusOnMount = false }: CaseReviewPanelProps) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // On a phone the queue shows the confirmation; don't scroll away from it.
    if (focusOnMount) headingRef.current?.focus({ preventScroll: window.matchMedia('(max-width: 760px)').matches })
  }, [focusOnMount])

  const flagged = [
    ...application.scoringResult.metrics.filter((m) => m.severity === 'flagged' || m.severity === 'reject')
      .map((m) => ({ key: m.key, label: `${m.label} ${formatMetric(m.value, m.key)}`, severity: m.severity, note: m.note })),
    ...(application.scoringResult.rules ?? []).filter((r) => r.severity === 'flagged' || r.severity === 'reject')
      .map((r) => ({ key: r.key, label: swedishDecimals(r.label), severity: r.severity, note: r.note })),
  ].sort((a, b) => (a.severity === 'reject' ? 0 : 1) - (b.severity === 'reject' ? 0 : 1)) // reject-level first
  const flagLine = (f: { label: string; note?: string }) => {
    const note = f.note ? swedishDecimals(f.note) : ''
    return note ? `${f.label} (${note.charAt(0).toLocaleLowerCase('sv-SE')}${note.slice(1)})` : f.label
  }
  // A one-line reading of the flags; the backend's own log stays available below.
  const reasonSummary = flagged.length === 0
    ? 'Inga varningar. Alla nyckeltal är inom gränserna.'
    : `${flagged.length} ${flagged.length === 1 ? 'varning' : 'varningar'}: ${flagged.map(flagLine).join('; ')}.`
  // One wording everywhere: the scoring recommends, the case worker decides.
  const recommendation = application.scoringResult.decision === 'APPROVED' ? 'Bevilja' : application.scoringResult.decision === 'REJECTED' ? 'Avslå' : 'Ingen, granska manuellt'
  // Approving here goes against the scoring: it recommends a rejection, or a
  // reject-level flag fired.
  const rejectFlags = flagged.filter((f) => f.severity === 'reject')
  const againstReject = application.scoringResult.decision === 'REJECTED' || rejectFlags.length > 0
  // The decision already made, shown up front on a decided case.
  const lastManual = [...application.auditTrail].reverse().find((event) => event.action === 'MANUAL_DECISION')
  const recommendationTone = application.scoringResult.decision === 'APPROVED' ? styles.recommendationAPPROVED : application.scoringResult.decision === 'REJECTED' ? styles.recommendationREJECTED : styles.recommendationREVIEW

  const isOpen = application.status === 'UNDER_REVIEW' || application.status === 'PENDING_DOCS'
  // An automatic APPROVED/REJECTED may be overridden once by a person.
  const isAutomaticallyDecided =
    (application.status === 'APPROVED' || application.status === 'REJECTED') &&
    !application.auditTrail.some((event) => event.action === 'MANUAL_DECISION')
  const canDecide = (isOpen || isAutomaticallyDecided) && Boolean(onDecision)
  const decisionOptions: Decision[] = isOpen ? ['APPROVED', 'REJECTED'] : application.status === 'APPROVED' ? ['REJECTED'] : ['APPROVED']

  const amount = formatSEK(application.amount)

  function requestDecision(status: Decision) {
    if (!comment.trim()) {
      setError('Skriv en motivering innan du fattar beslut.')
      commentRef.current?.focus()
      return
    }
    if (status === 'APPROVED' && againstReject && comment.trim().length < OVERRIDE_MIN) {
      setError(`Du beviljar mot en avslagsrekommendation. Motivera med minst ${OVERRIDE_MIN} tecken (nu ${comment.trim().length}).`)
      commentRef.current?.focus()
      return
    }
    setError('')
    setPendingDecision(status)
  }

  function confirmDecision() {
    if (!pendingDecision || !onDecision || !comment.trim()) return
    const saved = onDecision(application.id, pendingDecision, comment.trim())
    setPendingDecision(null)
    if (!saved) {
      // Decided elsewhere since this view loaded; keep the text, say so.
      setError('Ärendet har redan fått ett beslut, i en annan flik eller av en annan handläggare. Ditt beslut sparades inte.')
      return
    }
    setComment('')
  }

  return (
    <article className={styles.panel} aria-labelledby="case-review-heading">
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 id="case-review-heading" ref={headingRef} tabIndex={-1} className={styles.caseHeading}>{application.companyName}</h2>
          <p className={styles.companyMeta}>
            {/* Each fact wraps as a unit, never inside a name. */}
            <span>Ansökan {application.id.toUpperCase()}</span> · <span>Org.nr {application.orgNumber}</span> · <span>Firmatecknare {application.signatory || 'Ej angiven'}</span>
          </p>
        </div>
        <span className={joinClassNames(styles.status, styles[`status${application.status}`])}>{STATUS_LABEL[application.status]}</span>
      </header>

      {application.status === 'APPROVED' || application.status === 'REJECTED' ? (
        <section className={styles.decisionSummary} aria-labelledby="decision-summary-heading">
          <h3 id="decision-summary-heading">Beslut</h3>
          {lastManual ? (
            <>
              <p className={styles.decisionMeta}>
                {lastManual.actor ?? 'Handläggare'} · {formatDateTime(lastManual.ts)}{lastManual.details.override === true ? ' · ändrade det automatiska beslutet' : ''}
              </p>
              {typeof lastManual.details.comment === 'string' && lastManual.details.comment ? (
                <p className={styles.decisionComment}>{lastManual.details.comment}</p>
              ) : null}
            </>
          ) : (
            <p className={styles.decisionMeta}>Automatiskt beslut · {formatDateTime(application.scoringResult.scoredAt)}</p>
          )}
        </section>
      ) : null}

      {/* The evidence first: the scoring's recommendation and flagged ratios
          sit right under the header, before the details and the decision. */}
      <section className={styles.scoringSection} aria-labelledby="scoring-heading">
        <div className={styles.sectionHeader}>
          <h3 id="scoring-heading">Automatisk kreditbedömning</h3>
          <span className={styles.recoGroup}>
            <span className={joinClassNames(styles.recommendation, recommendationTone)}>Rekommendation: {recommendation}</span>
            {typeof application.scoringResult.creditScore === 'number' ? <span className={styles.scoreNote}>Kreditpoäng {application.scoringResult.creditScore} (startvärde 100)</span> : null}
          </span>
        </div>
        {flagged.length > 2 ? (
          <div className={styles.reason}>
            <p className={styles.reasonLead}>{flagged.length} varningar</p>
            <ul className={styles.reasonList}>
              {flagged.slice(0, 5).map((f) => (
                <li key={f.key}>{flagLine(f)}</li>
              ))}
            </ul>
            {flagged.length > 5 ? (
              <details className={styles.moreFlags}>
                <summary>Visa {flagged.length - 5} till</summary>
                <ul className={styles.reasonList}>
                  {flagged.slice(5).map((f) => (
                    <li key={f.key}>{flagLine(f)}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : (
          <p className={styles.reason}>{reasonSummary}</p>
        )}
        {application.scoringResult.decisionReason ? (
          <details className={styles.techLog}>
            <summary>Teknisk logg från bedömningen</summary>
            <p>{application.scoringResult.decisionReason}</p>
          </details>
        ) : null}
        <ul className={styles.metricList}>
          {application.scoringResult.metrics.map((metric) => (
            <li key={metric.key}>
              <span className={styles.metricName}>{metric.label}</span>
              {/* A ratio that doesn't apply is not a pass: no 0, no green chip. */}
              {metric.note === 'Ej tillämplig' ? (
                <>
                  <span className={styles.metricValue}>—</span>
                  <span className={joinClassNames(styles.metricSeverity, styles.severityna)}>Ej tillämplig</span>
                </>
              ) : (
                <>
                  <span className={styles.metricValue}>{formatMetric(metric.value, metric.key)}</span>
                  <span className={joinClassNames(styles.metricSeverity, styles[`severity${metric.severity}`])}>{SEVERITY_LABEL[metric.severity]}</span>
                  <span className={styles.metricNote}>{swedishDecimals(metric.note)}</span>
                </>
              )}
            </li>
          ))}
        </ul>
        {application.scoringResult.rules?.length ? (
          <>
            <h4 className={styles.rulesHeading}>Fler regler i bedömningen{application.industry ? ` · bransch ${application.industry}` : ''}</h4>
            <ul className={styles.metricList}>
              {application.scoringResult.rules.map((rule) => (
                <li key={rule.key}>
                  <span className={styles.metricName}>{swedishDecimals(rule.label)}</span>
                  <span className={joinClassNames(styles.metricSeverity, styles[`severity${rule.severity}`])}>{SEVERITY_LABEL[rule.severity]}</span>
                  <span className={styles.metricNote}>{swedishDecimals(rule.note)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className={styles.requestCard} aria-labelledby="request-heading">
        <div className={styles.sectionHeader}>
          <h3 id="request-heading">Sökt kredit</h3>
          <span>Inskickad {formatDate(application.submittedAt)}</span>
        </div>
        <dl className={styles.requestGrid}>
          <div><dt>Belopp</dt><dd>{amount}</dd></div>
          <div><dt>Återbetalningstid</dt><dd>{application.termMonths ? `${application.termMonths} månader` : 'Ej angiven'}</dd></div>
          <div className={styles.purpose}><dt>Syfte</dt><dd>{application.purpose || 'Ej angivet'}</dd></div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="financial-heading">
        <div className={styles.sectionHeader}>
          <h3 id="financial-heading">Företagets ekonomiska uppgifter</h3>
          <span>{application.financials.reportingPeriod || 'Rapporteringsperiod saknas'}{application.financials.cashFlowStatementMissing ? ' · Kassaflödesanalys saknas, kassaflödena räknas som 0 i bedömningen' : ''}</span>
        </div>
        <dl className={styles.financialGrid}>
          {FINANCIAL_FIELDS.map(([label, key]) => (
            <div key={key}><dt>{label}</dt><dd>{displayFinancialValue(application.financials[key])}</dd></div>
          ))}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="company-check-heading">
        <div className={styles.sectionHeader}>
          <h3 id="company-check-heading">Företagskontroll och signatur</h3>
          {application.companyValidation ? <span>Kontrollerad {formatDate(application.companyValidation.validatedAt)}</span> : null}
        </div>
        {application.companyValidation || application.signature ? (
          <dl className={styles.financialGrid}>
            {application.companyValidation ? (
              <>
                <div><dt>Registrering</dt><dd>{REGISTRATION_LABEL[application.companyValidation.registrationStatus]}</dd></div>
                <div><dt>F-skatt</dt><dd>{application.companyValidation.fSkattRegistered ? 'Ja' : 'Nej'}</dd></div>
                <div><dt>Momsregistrerat</dt><dd>{application.companyValidation.vatRegistered ? 'Ja' : 'Nej'}</dd></div>
                <div><dt>Behöriga firmatecknare</dt><dd>{application.companyValidation.authorizedSignatories.join(', ') || 'Inga registrerade'}</dd></div>
              </>
            ) : null}
            {application.signature ? (
              <div><dt>Signerad med BankID</dt><dd>{application.signature.signedBy}, {formatDate(application.signature.signedAt)}</dd></div>
            ) : null}
          </dl>
        ) : (
          <p className={styles.help}>Ingen företagskontroll eller signatur finns för den här ansökan.</p>
        )}
      </section>

      {(application.documents?.length ?? 0) > 0 ? (
        <section className={styles.section} aria-labelledby="documents-heading">
          <div className={styles.sectionHeader}>
            <h3 id="documents-heading">Dokument</h3>
          </div>
          {application.documents?.length ? (
            <ul className={styles.documentList}>
              {application.documents.map((document) => (
                <li key={document.id}><strong>{document.fileName}</strong><span>{document.category} · {formatDate(document.uploadedAt)}</span></li>
              ))}
            </ul>
          ) : (
            <p className={styles.help}>Inga dokument har skickats in ännu.</p>
          )}
        </section>
      ) : null}


      <details className={styles.history}>
        <summary>Ärendehistorik ({application.auditTrail.length})</summary>
        <ol>
          {[...application.auditTrail].reverse().map((event) => (
            <li key={event.id}>
              <strong>{AUDIT_ACTION_LABELS[event.action]}</strong>
              <span>{formatDate(event.ts)}{event.actor ? ` · ${event.actor}` : ''}</span>
              {typeof event.details.decision === 'string' ? <p>Beslut: {auditDecisionLabel(event.details.decision)}</p> : null}
              {typeof event.details.result === 'string' ? <p>Automatisk bedömning: {auditDecisionLabel(event.details.result)}</p> : null}
              {typeof event.details.flags === 'number' ? <p>Flaggor i bedömningen: {event.details.flags}</p> : null}
              {typeof event.details.documents === 'string' ? <p>Underlag: {event.details.documents}</p> : null}
              {typeof event.details.categories === 'string' ? <p>Dokumenttyp: {event.details.categories}</p> : null}
              {event.details.override === true ? <p>Ändrade det automatiska beslutet</p> : null}
              {typeof event.details.comment === 'string' && event.details.comment ? <p>{event.details.comment}</p> : null}
            </li>
          ))}
        </ol>
      </details>

      {canDecide ? (
        <form className={styles.decisionForm} onSubmit={(event) => event.preventDefault()}>
          <div className={styles.sectionHeader}>
            <h3>{isAutomaticallyDecided ? 'Ändra automatiskt beslut' : 'Handläggarbeslut'}</h3>
            {isAutomaticallyDecided ? <span>Det automatiska beslutet kan ändras en gång</span> : null}
          </div>
          {/* The evidence the decision rests on, repeated next to the comment
              so it doesn't have to be scrolled back to. */}
          <div className={styles.decisionEvidence}>
            <p>Rekommendation: <strong>{recommendation}</strong></p>
            {flagged.length ? (
              <ul aria-label="Att kontrollera">
                {/* The three most serious; the full list is in the assessment above. */}
                {[...flagged].sort((a, b) => (a.severity === 'reject' ? 0 : 1) - (b.severity === 'reject' ? 0 : 1)).slice(0, 3).map((item) => (
                  <li key={item.key}><span className={joinClassNames(styles.metricSeverity, styles[`severity${item.severity}`])}>{SEVERITY_LABEL[item.severity]}</span> {item.label}</li>
                ))}
                {flagged.length > 3 ? <li className={styles.moreCount}>+{flagged.length - 3} till</li> : null}
              </ul>
            ) : <p className={styles.help}>Inga flaggade nyckeltal.</p>}
          </div>
          <label htmlFor={`decision-reason-${application.id}`} className={styles.commentLabel}>Motivering (obligatorisk)</label>
          <textarea
            ref={commentRef}
            id={`decision-reason-${application.id}`}
            required
            value={comment}
            onChange={(event) => { setComment(event.target.value); setError('') }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `decision-error-${application.id} decision-help-${application.id}` : `decision-help-${application.id}`}
            maxLength={COMMENT_MAX}
            rows={2}
            placeholder="Skriv en kort motivering"
            className={styles.commentInput}
          />
          {error ? <p id={`decision-error-${application.id}`} className={styles.error} role="alert">{error}</p> : null}
          {<p id={`decision-help-${application.id}`} className={joinClassNames(styles.help, styles.helpRow)}><span>Den sökande ser motiveringen. Den sparas också i ärendehistoriken.{againstReject && decisionOptions.includes('APPROVED') ? ` Att bevilja mot avslagsrekommendationen kräver minst ${OVERRIDE_MIN} tecken.` : ''}</span><span className={styles.counter}>{againstReject && decisionOptions.includes('APPROVED') && comment.trim().length < OVERRIDE_MIN ? `${comment.trim().length} / minst ${OVERRIDE_MIN} tecken för att bevilja` : `${comment.length} / ${COMMENT_MAX} tecken`}</span></p>}
          <div className={styles.actions}>
            {decisionOptions.includes('APPROVED') ? (
              <button type="button" className={styles.approveButton} onClick={() => requestDecision('APPROVED')}>
                {isAutomaticallyDecided ? 'Ändra till beviljad' : 'Bevilja ansökan'}
              </button>
            ) : null}
            {decisionOptions.includes('REJECTED') ? (
              <button type="button" className={styles.rejectButton} onClick={() => requestDecision('REJECTED')}>
                {isAutomaticallyDecided ? 'Ändra till avslag' : 'Avslå ansökan'}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <Dialog open={pendingDecision !== null} onOpenChange={(open) => { if (!open) setPendingDecision(null) }}>
        <DialogContent className={styles.confirmDialog}>
          <DialogHeader className={styles.confirmHeader}>
            <DialogTitle className={styles.confirmTitle}>{pendingDecision ? `${decisionLabel(pendingDecision, isAutomaticallyDecided)}?` : 'Bekräfta beslut'}</DialogTitle>
            <DialogDescription className={styles.confirmDescription}>{isAutomaticallyDecided ? 'Det automatiska beslutet ersätts.' : 'Den sökande meddelas.'} Ett handläggarbeslut kan inte ändras efteråt.</DialogDescription>
          </DialogHeader>
          {pendingDecision === 'APPROVED' && againstReject ? (
            <div className={styles.againstBlock} role="note">
              <p><strong>Beslutet går emot den automatiska bedömningen.</strong> Rekommendation: {recommendation}.</p>
              {rejectFlags.length ? (
                <ul>
                  {rejectFlags.map((f) => <li key={f.key}>{flagLine(f)}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
          {pendingDecision ? (
            <dl className={styles.confirmSummary}>
              <div><dt>Företag</dt><dd>{application.companyName}</dd></div>
              <div><dt>Organisationsnummer</dt><dd>{application.orgNumber}</dd></div>
              <div><dt>Belopp</dt><dd>{amount}</dd></div>
              <div className={styles.confirmComment}><dt>Motivering</dt><dd>{comment.trim()}</dd></div>
            </dl>
          ) : null}
          <DialogFooter className={styles.confirmFooter}>
            <button type="button" className={styles.cancelButton} onClick={() => setPendingDecision(null)}>Tillbaka till ärendet</button>
            <button type="button" className={styles.confirmButton} onClick={confirmDecision}>{pendingDecision ? decisionLabel(pendingDecision, isAutomaticallyDecided) : 'Bekräfta beslut'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
