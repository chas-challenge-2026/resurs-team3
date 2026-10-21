/**
 * Java's response for GET /api/applications and
 * GET /api/applications/{id}.
 *
 * Some fields can be null for older applications.
 */
export type ApplicationReadResponse = {
  applicationId: number;
  caseNumber: string | null;
  requestedAmount: number | null;
  purpose: string | null;
  status: string;
  decision: string | null;
  decisionReason: string | null;
  createdAt: string | null;
  companyName: string | null;
};

export class ApplicationReadApiError extends Error {
  readonly status: number | null;

  constructor(status: number | null, message: string) {
    super(message);
    this.name = "ApplicationReadApiError";
    this.status = status;
  }
}

// Never trust an HTTP response without checking its shape.
function isApplication(value: unknown): value is ApplicationReadResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  const nullableString = (v: unknown) =>
    v === null || typeof v === "string";

  return (
    typeof item.applicationId === "number" &&
    Number.isSafeInteger(item.applicationId) &&
    item.applicationId > 0 &&
    nullableString(item.caseNumber) &&
    (item.requestedAmount === null ||
      (typeof item.requestedAmount === "number" &&
        Number.isFinite(item.requestedAmount))) &&
    nullableString(item.purpose) &&
    typeof item.status === "string" &&
    nullableString(item.decision) &&
    nullableString(item.decisionReason) &&
    nullableString(item.createdAt) &&
    nullableString(item.companyName)
  );
}

async function readJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      signal,
    });
  } catch (error) {
    // React can cancel an outdated request when a page changes.
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApplicationReadApiError(
      null,
      "Det gick inte att ansluta till servern.",
    );
  }

  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Du behöver logga in för att se ansökningarna.",
      403: "Du saknar behörighet att se ansökningarna.",
      404: "Ansökan kunde inte hittas.",
      500: "Ett serverfel uppstod. Försök igen senare.",
    };

    throw new ApplicationReadApiError(
      response.status,
      messages[response.status] ??
        "Det gick inte att hämta ansökningarna.",
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ApplicationReadApiError(
      response.status,
      "Servern skickade ett ogiltigt JSON-svar.",
    );
  }
}

/** Get all applications belonging to the authenticated company. */
export async function getApplications(
  signal?: AbortSignal,
): Promise<ApplicationReadResponse[]> {
  const data = await readJson("/api/applications", signal);

  if (!Array.isArray(data) || !data.every(isApplication)) {
    throw new ApplicationReadApiError(
      200,
      "Serverns lista med ansökningar har ett oväntat format.",
    );
  }

  return data;
}

/** Get one application by its database ID. */
export async function getApplication(
  id: number,
  signal?: AbortSignal,
): Promise<ApplicationReadResponse> {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Ogiltigt ansöknings-ID.");
  }

  const data = await readJson(`/api/applications/${id}`, signal);

  if (!isApplication(data)) {
    throw new ApplicationReadApiError(
      200,
      "Serverns ansökan har ett oväntat format.",
    );
  }

  return data;
}
