
import { Link } from "react-router-dom";
import type { ApplicationReadResponse } from "../../features/credit-application/applicationRead.api";
import { STATUS_LABEL } from "../../features/credit-application/statusLabels";
import { ROUTES } from "../../routes";
import styles from "./ApplicationStatusPage.module.css";

type Props = {
  application: ApplicationReadResponse;
};

const STATUS_TONES: Record<string, string> = {
  APPROVED: styles.toneApproved,
  REJECTED: styles.toneRejected,
  UNDER_REVIEW: styles.toneReview,
  PENDING_DOCS: styles.tonePending,
};

function formatAmount(value: number | null): string {
  if (value === null) return "Belopp saknas";

  return `${new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 0,
  }).format(value)} SEK`;
}

function formatDate(value: string | null): string {
  if (!value) return "Datum saknas";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Datum saknas";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
  }).format(date);
}

export function BackendApplicationStatusView({
  application,
}: Props) {
  const reference =
    application.caseNumber?.trim() ||
    `#${application.applicationId}`;

  const statusLabel =
    STATUS_LABEL[application.status as keyof typeof STATUS_LABEL] ??
    "Okänd status";

  const statusTone = STATUS_TONES[application.status] ?? "";

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Brödsmulor">
        <Link to={ROUTES.overview}>Översikt</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>
          Ansökan {reference}
        </h1>

        <p className={styles.meta}>
          {application.companyName || "Företag ej angivet"}
          {" · "}
          {formatAmount(application.requestedAmount)}
        </p>
      </header>

      <section
        className={`${styles.panel} ${statusTone}`}
        aria-labelledby="backend-status-heading"
      >
        <h2
          id="backend-status-heading"
          className={styles.sectionHeading}
        >
          Aktuell registrerad status
        </h2>

        <span className={styles.statusBadge}>
          {statusLabel}
        </span>

        <p className={styles.body}>
          Visar registrerad status vid senaste hämtningen.
        </p>
      </section>

      <section
        className={styles.panel}
        aria-labelledby="backend-details-heading"
      >
        <h2
          id="backend-details-heading"
          className={styles.sectionHeading}
        >
          Ansökningsuppgifter
        </h2>

        <dl className={styles.summary}>
          <div>
            <dt>Ärendenummer</dt>
            <dd>{reference}</dd>
          </div>

          <div>
            <dt>Syfte</dt>
            <dd>{application.purpose || "Ej angivet"}</dd>
          </div>

          <div>
            <dt>Belopp</dt>
            <dd>{formatAmount(application.requestedAmount)}</dd>
          </div>

          <div>
            <dt>Registrerad</dt>
            <dd>{formatDate(application.createdAt)}</dd>
          </div>
        </dl>
      </section>

      {application.decisionReason?.trim() ? (
        <section
          className={styles.panel}
          aria-labelledby="backend-reason-heading"
        >
          <h2
            id="backend-reason-heading"
            className={styles.sectionHeading}
          >
            Beslutsinformation
          </h2>

          <p className={styles.body}>
            {application.decisionReason}
          </p>
        </section>
      ) : null}
    </div>
  );
}
