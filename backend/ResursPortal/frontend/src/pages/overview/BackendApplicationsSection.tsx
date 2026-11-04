
import { useApplications } from "../../features/credit-application/useApplications";
import { BackendApplicationCard } from "./BackendApplicationCard";
import styles from "./OverviewPage.module.css";


type Props = {
  enabled: boolean;
  sessionKey: string | null;
};

export function BackendApplicationsSection({
  enabled,
  sessionKey,
}: Props) {
  const { applications, loading, error } = useApplications(
    enabled,
    sessionKey,
  );

  if (!enabled || !sessionKey?.trim()) {
    return null;
  }

  return (
    <section
      className={styles.applicationsSection}
      aria-labelledby="backend-applications-heading"
      aria-busy={loading}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="backend-applications-heading">
            Mina ansökningar
          </h2>
          <p>
            Följ status och se beslutsinformation
            för företagets ansökningar.
          </p>
        </div>

        {!loading && !error && (
          <span className={styles.count}>
            {applications.length}{" "}
            {applications.length === 1
              ? "ansökan"
              : "ansökningar"}
          </span>
        )}
      </div>

      {loading ? (
        <p role="status">
          Hämtar företagets ansökningar…
        </p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : applications.length > 0 ? (
        <div className={styles.applicationList}>
          {applications.map((application) => (
            <BackendApplicationCard
              key={application.applicationId}
              application={application}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>Inga ansökningar ännu</h3>
          <p>
            Inga registrerade ansökningar hittades
            för företaget.
          </p>
        </div>
      )}
    </section>
  );
}
