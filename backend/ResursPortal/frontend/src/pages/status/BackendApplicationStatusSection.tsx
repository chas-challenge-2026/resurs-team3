
import { Link } from "react-router-dom";
import { useApplication } from "../../features/credit-application/useApplication";
import { ROUTES } from "../../routes";
import { BackendApplicationStatusView } from "./BackendApplicationStatusView";

type Props = {
  applicationId: number | null;
  enabled: boolean;
  sessionKey: string | null;
};

export function BackendApplicationStatusSection({
  applicationId,
  enabled,
  sessionKey,
}: Props) {
  const { application, loading, error } = useApplication(
    applicationId,
    enabled,
    sessionKey,
  );

  // Only activate when backend authentication is ready.
  if (!enabled || !sessionKey) {
    return null;
  }

  if (
    applicationId === null ||
    !Number.isSafeInteger(applicationId) ||
    applicationId <= 0
  ) {
    return <p role="alert">Ogiltigt ansöknings-ID.</p>;
  }

  if (loading) {
    return <p role="status">Hämtar ansökan…</p>;
  }

  if (error) {
    return (
      <section role="alert">
        <h1>Ansökan kunde inte hämtas</h1>
        <p>{error}</p>
        <Link to={ROUTES.overview}>Till översikten</Link>
      </section>
    );
  }

  if (!application) {
    return <p role="alert">Ansökan kunde inte visas.</p>;
  }

  return <BackendApplicationStatusView application={application} />;
}
