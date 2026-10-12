import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useCases } from '../../context/useCases'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/Icon'
import { STATUS_LABEL } from '../../features/credit-application/statusLabels'
import { explainApproval, explainOutcome } from '../../features/credit-application/outcomeExplanation'
import type { ApplicationStatus } from '../../types/case'
import { joinClassNames } from '../../lib/joinClassNames'
import { buildApplicationProgress, documentsPath, manualDecisionComment } from './applicationProgress'
import styles from './ApplicationStatusPage.module.css'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ROUTES } from '../../routes'

const STATUS_COPY: Record<ApplicationStatus, { heading: string; body: string }> = {
  UNDER_REVIEW: {
    heading: 'En handläggare granskar ansökan',
    body: 'Ni behöver inte göra något just nu. Sidan uppdateras när beslutet är klart.',
  },
  PENDING_DOCS: {
    heading: 'Vi behöver fler underlag',
    body: 'Lägg till de underlag som saknas under Mina handlingar, så fortsätter bedömningen.',
  },
  APPROVED: {
    heading: 'Ansökan är beviljad',
    body: 'Resurs kontaktar er om avtal och utbetalning.',
  },
  REJECTED: {
    heading: 'Ansökan är avslagen',
    body: 'Vi kan tyvärr inte bevilja ansökan utifrån de nyckeltal ni angav.',
  },
}

const STATUS_TONE: Record<ApplicationStatus, string> = {
  UNDER_REVIEW: styles.toneReview,
  PENDING_DOCS: styles.tonePending,
  APPROVED: styles.toneApproved,
  REJECTED: styles.toneRejected,
}

const sek = (value: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value)} SEK`
const dateTime = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: date.getUTCHours() || date.getUTCMinutes() ? 'short' : undefined }).format(date)
}

/**
 * Status portal: the applicant's view of one submitted application — where
 * it is, what happened so far, and what (if anything) they can do. State
 * comes from CasesContext, which syncs across tabs, so a case worker's
 * decision in the backoffice shows up here without a reload.
 */
export function ApplicationStatusPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { cases, applicantMessages, markMessagesRead } = useCases()
  const navigate = useNavigate()
  const location = useLocation()
  // Set by the wizard right after BankID signing: this page is then the end
  // of the application flow and opens with a confirmation. Read once, then
  // dropped from history so a reload shows the ordinary status view.
  const [justSubmitted] = useState(() => Boolean((location.state as { justSubmitted?: boolean } | null)?.justSubmitted))
  const statusHeadingRef = useRef<HTMLHeadingElement>(null)
  const company = user?.role === 'client' ? user : null
  const creditCase = cases.find(
    (item) => item.id === id && company && (item.orgNumber === company.orgNumber || item.companyName === company.companyName),
  )
  useDocumentTitle(creditCase ? `Ansökan ${creditCase.id.toUpperCase()}: ${STATUS_LABEL[creditCase.status]}` : 'Ansökan hittades inte')
  const caseMessages = creditCase ? applicantMessages.filter((message) => message.caseId === creditCase.id) : []
  const unreadIds = caseMessages.filter((message) => !message.read).map((message) => message.id).join(',')

  // Opening the application counts as reading its messages.
  useEffect(() => {
    if (unreadIds) markMessagesRead(unreadIds.split(','))
  }, [unreadIds, markMessagesRead])

  useEffect(() => {
    if (!justSubmitted) return
    navigate(location.pathname, { replace: true, state: null })
    statusHeadingRef.current?.focus()
    // Runs once on arrival; location/navigate are stable enough for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSubmitted])

  if (!creditCase) {
    return (
      <div className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Brödsmulor">
          <Link to={ROUTES.overview}>Översikt</Link>
        </nav>
        <section className={styles.panel}>
          <h1 className={styles.title}>Ansökan hittades inte</h1>
          <p className={styles.body}>Vi hittar ingen ansökan med nummer {id.toUpperCase()} för ert företag.</p>
          <div className={styles.actions}>
            <Button type="button" surface="paper" onClick={() => navigate(ROUTES.overview)}>Gå till Översikt</Button>
          </div>
        </section>
      </div>
    )
  }

  const reference = creditCase.id.toUpperCase()
  const copy = STATUS_COPY[creditCase.status]
  const progress = buildApplicationProgress(creditCase)
  const reasons = explainOutcome(creditCase)
  const caseworkerComment = manualDecisionComment(creditCase)
  const decidedByPerson = Boolean(caseworkerComment)
  const approvalReasons = creditCase.status === 'APPROVED' && !decidedByPerson ? explainApproval(creditCase) : []
  const currentStep = progress.find((step) => step.state === 'current')
  const body =
    creditCase.status === 'APPROVED' && !decidedByPerson
      ? 'Ansökan har beviljats automatiskt utifrån företagets nyckeltal. Resurs kontaktar er om avtal och utbetalning.'
      : copy.body
  const reasonsTitle =
    creditCase.status === 'REJECTED' && !decidedByPerson
      ? 'Därför avslogs ansökan'
      : creditCase.status === 'UNDER_REVIEW'
        ? 'Det här granskas'
        : 'Det här granskades'

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Brödsmulor">
        <Link to={ROUTES.overview}>Översikt</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Ansökan {reference}</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Ansökan {reference}</h1>
        <p className={styles.meta}>
          {creditCase.companyName} · {sek(creditCase.amount)}
          {creditCase.termMonths ? ` · ${creditCase.termMonths} månader` : ''} · Inskickad {dateTime(creditCase.submittedAt)}
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={joinClassNames(styles.panel, STATUS_TONE[creditCase.status])} aria-labelledby="status-heading">
            {/* Only the status line is announced when a decision arrives from
                another tab, not the whole panel. */}
            <p className={styles.srOnly} aria-live="polite">Status: {STATUS_LABEL[creditCase.status]}</p>
            <span className={styles.statusBadge}>{STATUS_LABEL[creditCase.status]}</span>
            <h2 id="status-heading" ref={statusHeadingRef} tabIndex={-1} className={styles.statusHeading}>{copy.heading}</h2>
            <p className={styles.statusBody}>{body}</p>
            {/* Arrival from the wizard: "it's done" sits right under the
                decision, before any detail, instead of last in the panel. */}
            {justSubmitted ? (
              /* A rejection gets a plain receipt line: no thanks, no check. */
              creditCase.status === 'REJECTED' ? (
                <p className={joinClassNames(styles.confirmation, styles.confirmationNeutral)}>
                  Ansökan är inskickad och signerad med BankID. En bekräftelse har skickats via e-post.
                </p>
              ) : (
                <p className={styles.confirmation}>
                  <Icon name="check" className={styles.confirmationIcon} />
                  <span>Tack! Ansökan är inskickad och signerad med BankID. En bekräftelse har skickats via e-post.</span>
                </p>
              )
            ) : null}
            {currentStep && currentStep.eta !== '—' ? (
              <p className={styles.nextStep}>
                <span className={styles.nextStepLabel}>Nu pågår</span> {currentStep.title} · beräknad tid {currentStep.eta}
              </p>
            ) : null}

            {approvalReasons.length > 0 ? (
              <div className={styles.inset}>
                <h3 className={styles.insetTitle}>Därför beviljades ansökan</h3>
                <ul className={styles.reasonList}>
                  {approvalReasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
            ) : null}

            {caseworkerComment ? (
              <div className={styles.inset}>
                <h3 className={styles.insetTitle}>Handläggarens motivering</h3>
                <p className={styles.insetText}>{caseworkerComment}</p>
              </div>
            ) : null}

            {reasons.length > 0 && creditCase.status !== 'APPROVED' ? (
              <div className={styles.inset}>
                <h3 className={styles.insetTitle}>{reasonsTitle}</h3>
                {/* The first reason (the backend's first failing ratio) carries
                    the decision; the rest are listed, quieter, under it. */}
                <p className={styles.primaryReason}>{reasons[0]}</p>
                {reasons.length > 1 ? (
                  <>
                    <p className={styles.otherReasonsTitle}>Övriga skäl</p>
                    <ul className={styles.reasonList}>
                      {reasons.slice(1).map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : null}

            {/* A rejection isn't the end of the conversation: one concrete
                thing to do now, and a way on. The reason texts above stay the
                backend's own. */}
            {creditCase.status === 'REJECTED' ? (
              <>
                <p className={styles.body}>
                  Om företagets nyckeltal förändras, till exempel efter nästa fastställda årsredovisning, är ni välkomna att ansöka igen.
                </p>
                <div className={styles.actions}>
                  <a className={styles.actionPrimary} href="tel:+46850012000">
                    Ring oss om beslutet
                    <span className={styles.actionDetail}>08-500 120 00</span>
                  </a>
                  <Link className={styles.inlineLink} to={ROUTES.overview}>Till översikten</Link>
                </div>
                <p className={styles.actionNote}>Uppge ansökningsnummer {reference}, så kan en handläggare gå igenom beslutet med er.</p>
              </>
            ) : null}

            {/* Only a request for documents makes adding them the action.
                Under review it's optional, so it stays a quiet line that
                doesn't contradict "Ni behöver inte göra något just nu". */}
            {creditCase.status === 'PENDING_DOCS' ? (
              <div className={styles.actions}>
                <Button type="button" surface="paper" onClick={() => navigate(documentsPath(creditCase.id))} icon={<Icon name="arrow-right" />}>
                  Lägg till underlag
                </Button>
              </div>
            ) : null}
            {creditCase.status === 'UNDER_REVIEW' ? (
              <p className={styles.body}>
                Vill ni komplettera med fler underlag?{' '}
                <Link className={styles.inlineLink} to={documentsPath(creditCase.id)}>Lägg till underlag</Link>
              </p>
            ) : null}

            {/* The signature record, on every visit. */}
            {creditCase.signature ? (
              <p className={styles.receipt}>
                Signerad med BankID av {creditCase.signature.signedBy} · <time dateTime={creditCase.signature.signedAt}>{dateTime(creditCase.signature.signedAt)}</time> · Ärende {reference}
              </p>
            ) : null}
          </section>

          <section className={styles.panel} aria-labelledby="progress-heading">
            <h2 id="progress-heading" className={styles.sectionHeading}>Förlopp</h2>
            <ol className={styles.progress}>
              {progress.map((step) => (
                <li
                  key={step.key}
                  className={joinClassNames(styles.progressStep, styles[`progress_${step.state}`])}
                  aria-current={step.state === 'current' ? 'step' : undefined}
                >
                  <span className={styles.marker} aria-hidden="true">
                    {step.state === 'done' ? <Icon name="check" className={styles.markerIcon} /> : null}
                  </span>
                  <div className={styles.stepText}>
                    <p className={styles.stepTitle}>
                      {step.title}
                      <span className={styles.srOnly}>
                        {step.state === 'done' ? ', klart' : step.state === 'current' ? ', pågår' : ', väntar'}
                      </span>
                    </p>
                    <p className={styles.stepDetail}>{step.detail}</p>
                    {step.eta !== '—' && (step.state === 'current' || step.state === 'upcoming') ? <p className={styles.stepTime}>Beräknad tid: {step.eta}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className={styles.side} aria-label="Om ansökan">
          <section className={styles.panel}>
            <h2 className={styles.sectionHeading}>Ansökan</h2>
            <dl className={styles.summary}>
              <div><dt>Belopp</dt><dd>{sek(creditCase.amount)}</dd></div>
              {creditCase.termMonths ? <div><dt>Löptid</dt><dd>{creditCase.termMonths} månader</dd></div> : null}
              <div><dt>Firmatecknare</dt><dd>{creditCase.signatory}</dd></div>
              <div className={styles.summaryStacked}><dt>Syfte</dt><dd>{creditCase.purpose || '—'}</dd></div>
            </dl>
          </section>
          <section className={styles.panel} aria-labelledby="messages-heading">
            <h2 id="messages-heading" className={styles.sectionHeading}>Meddelanden</h2>
            {caseMessages.length ? (
              <ul className={styles.messageList}>
                {caseMessages.map((message) => (
                  <li key={message.id}>
                    <p className={styles.messageSubject}>{message.subject}</p>
                    <p className={styles.messageBody}>{message.body}</p>
                    <p className={styles.stepTime}>Skickat som e-post · <time dateTime={message.createdAt}>{dateTime(message.createdAt)}</time></p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.body}>Inga meddelanden ännu.</p>
            )}
          </section>
          {creditCase.documents && creditCase.documents.length > 0 ? (
            <section className={styles.panel} aria-labelledby="documents-heading">
              <h2 id="documents-heading" className={styles.sectionHeading}>Skickade dokument</h2>
              <ul className={styles.messageList}>
                {creditCase.documents.map((document) => (
                  <li key={document.id}>
                    <p className={styles.messageSubject}>{document.fileName}</p>
                    <p className={styles.stepTime}>{document.category} · <time dateTime={document.uploadedAt}>{dateTime(document.uploadedAt)}</time></p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className={joinClassNames(styles.panel, styles.helpPanel)}>
            <h2 className={styles.sectionHeading}>Frågor om ansökan?</h2>
            <p className={styles.body}>Uppge ansökningsnummer {reference} när ni kontaktar oss.</p>
            <a className={styles.inlineLink} href="tel:+46850012000">Ring kundservice på 08-500 120 00</a>
          </section>
        </aside>
      </div>
    </div>
  )
}
