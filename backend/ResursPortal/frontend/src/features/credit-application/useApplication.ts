
import { useEffect, useState } from "react";
import {
  getApplication,
  type ApplicationReadResponse,
} from "./applicationRead.api";

type ApplicationState = {
  requestKey: string | null;
  application: ApplicationReadResponse | null;
  loading: boolean;
  error: string | null;
};

export function useApplication(
  applicationId: number | null,
  enabled: boolean,
  sessionKey: string | null,
) {
  // Only fetch a valid ID when backend authentication is ready.
  const requestKey =
    enabled &&
    sessionKey &&
    applicationId !== null &&
    Number.isSafeInteger(applicationId) &&
    applicationId > 0
      ? JSON.stringify([sessionKey, applicationId])
      : null;

  const [state, setState] = useState<ApplicationState>(() => ({
    requestKey,
    application: null,
    loading: requestKey !== null,
    error: null,
  }));

  // Clear old data when the ID, session or enabled state changes.
  if (state.requestKey !== requestKey) {
    setState({
      requestKey,
      application: null,
      loading: requestKey !== null,
      error: null,
    });
  }

  useEffect(() => {
    if (requestKey === null || applicationId === null) {
      return;
    }

    const controller = new AbortController();

    getApplication(applicationId, controller.signal)
      .then((application) => {
        if (controller.signal.aborted) return;

        setState((previous) =>
          previous.requestKey === requestKey
            ? {
                requestKey,
                application,
                loading: false,
                error: null,
              }
            : previous,
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState((previous) =>
          previous.requestKey === requestKey
            ? {
                requestKey,
                application: null,
                loading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Ansökan kunde inte hämtas.",
              }
            : previous,
        );
      });

    return () => controller.abort();
  }, [applicationId, requestKey]);

  return state.requestKey === requestKey
    ? {
        application: state.application,
        loading: state.loading,
        error: state.error,
      }
    : {
        application: null,
        loading: requestKey !== null,
        error: null,
      };
}
