
import { useEffect, useState } from "react";
import {
  getApplications,
  type ApplicationReadResponse,
} from "./applicationRead.api";

type ApplicationsState = {
  requestKey: string | null;
  applications: ApplicationReadResponse[];
  loading: boolean;
  error: string | null;
};

export function useApplications(
  enabled: boolean,
  sessionKey: string | null = null,
) {
  const requestKey =
    enabled && sessionKey?.trim() ? sessionKey : null;

  const [state, setState] = useState<ApplicationsState>(() => ({
    requestKey,
    applications: [],
    loading: requestKey !== null,
    error: null,
  }));

  // Clear old data when the session changes.
  if (state.requestKey !== requestKey) {
    setState({
      requestKey,
      applications: [],
      loading: requestKey !== null,
      error: null,
    });
  }

  useEffect(() => {
    if (requestKey === null) return;

    const controller = new AbortController();

    getApplications(controller.signal)
      .then((applications) => {
        if (controller.signal.aborted) return;

        setState((previous) =>
          previous.requestKey === requestKey
            ? {
                requestKey,
                applications,
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
                applications: [],
                loading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Ansökningarna kunde inte hämtas.",
              }
            : previous,
        );
      });

    return () => controller.abort();
  }, [requestKey]);

  return state.requestKey === requestKey
    ? {
        applications: state.applications,
        loading: state.loading,
        error: state.error,
      }
    : {
        applications: [],
        loading: requestKey !== null,
        error: null,
      };
}
