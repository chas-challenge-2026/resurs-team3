
import type { ApplicationReadResponse } from "../../features/credit-application/applicationRead.api";
import { STATUS_LABEL } from "../../features/credit-application/statusLabels";
import { Link } from "react-router-dom";
import { applicationStatusPath } from "../status/applicationProgress";
import styles from "./OverviewPage.module.css";

type Props = {
  application: ApplicationReadResponse;
};

const STATUS_STYLES: Record<string, string> = {
  APPROVED: styles.approved,
  REJECTED: styles.rejected,
  UNDER_REVIEW: styles.review,
  PENDING_DOCS: styles.pending,
};

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

function formatAmount(value: number | null): string {
  if (value === null) return "Belopp saknas";

  return `${new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 0,
  }).format(value)} SEK`;
}

export function BackendApplicationCard({ application }: Props) {
  const statusLabel =
    STATUS_LABEL[application.status as keyof typeof STATUS_LABEL] ??
    "Okänd status";

  const statusStyle =
    STATUS_STYLES[application.status] ?? styles.pending;

  const reference =
    application.caseNumber?.trim() ||
    `#${application.applicationId}`;

  return (
    <article className={styles.applicationCard}>
      <div className={styles.applicationMain}>
        <div className={styles.applicationHeading}>
          <h3>
            <Link
              to={applicationStatusPath(String(application.applicationId))}
              className={styles.applicationLink}
            >
              Ansökan {reference}
            </Link>
          </h3>
          <span className={`${styles.statusBadge} ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>

        <p className={styles.purpose}>
          {application.purpose || "Företagskredit"}
        </p>

        <div className={styles.applicationMeta}>
          <span>{formatDate(application.createdAt)}</span>
          <span>{formatAmount(application.requestedAmount)}</span>
        </div>
      </div>

      {application.decisionReason ? (
        <details className={styles.details}>
          <summary>Visa beslutsinformation</summary>
          <p>{application.decisionReason}</p>
        </details>
      ) : null}
    </article>
  );
}
