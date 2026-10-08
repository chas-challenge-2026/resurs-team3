import type { CreditApplicationData } from "./creditApplication.types";

/**
 * Request contract for the new Java REST endpoint.
 *
 * This mirrors POST /api/applications.
 * The current React wizard only collects the required core fields, so some
 * backend-supported fields are kept optional for now 
 */
export type CreateApplicationRequest = {
  orgNumber: string;
  companyName: string;
  authorizedSignatory: string;

  egetKapital: number;
  totaltKapital: number;
  omsattningstillgangar: number;
  kortfristigaSkulder: number;
  totalaSkulder: number;
  rorelseresultat: number;
  nettoomsattning: number;

  requestedAmount: number;
  purpose: string;

  
   // These fields exist in the backend request model, but the current frontend
   // wizard does not collect them yet.

   // They are optional here on purpose:
   // do not send fake 0 values
   // do not send empty strings as if they were real user input
   // let backend handle their absence explicitly
   
  operativtKassaflode?: number;
  investeringsKassaflode?: number;
  ranteKostnader?: number;
  bransch?: string;
};

/**
 * Success response returned by POST /api/applications.
 *
 * Note:
 * - caseNumber is not included yet because backend generation/response support
 *   is still being worked on separately.
 */
export type CreateApplicationResponse = {
  applicationId: number;
  status: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  decision: "APPROVED" | "REJECTED" | "REVIEW";
  decisionReason: string;
  flagCount: number;
  creditScore: number;
};

/**
 * Backend validation errors are returned as:
 * HTTP 400 + { errors: { fieldName: message } }
 */
export type ApplicationValidationErrors = Record<string, string>;

/**
 * Custom error type for application submission failures.
 * We keep backend field errors on the error object so WizardPage can later map
 * them back to the correct form fields.
 */
export class ApplicationApiError extends Error {
  status: number;
  errors: ApplicationValidationErrors;

  constructor(
    status: number,
    message: string,
    errors: ApplicationValidationErrors = {},
  ) {
    super(message);
    this.name = "ApplicationApiError";
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Maps the React form model to the Java REST API request model.
 * - form inputs are stored as strings in React
 * - backend expects JSON numbers for financial values / requestedAmount
 */

export function toCreateApplicationRequest(
  data: CreditApplicationData,
): CreateApplicationRequest {
  return {
    orgNumber: data.orgNumber.trim(),
    companyName: data.companyName.trim(),
    authorizedSignatory: data.authorizedSignatory.trim(),

    egetKapital: Number(data.equity),
    totaltKapital: Number(data.totalCapital),
    omsattningstillgangar: Number(data.currentAssets),
    kortfristigaSkulder: Number(data.shortTermLiabilities),
    totalaSkulder: Number(data.totalDebt),
    rorelseresultat: Number(data.operatingProfit),
    nettoomsattning: Number(data.netSales),

    requestedAmount: Number(data.requestedAmount),
    purpose: data.purpose.trim(),
  };
}


 // Sends the application to the backend REST API.
 // Uses the Vite dev proxy:       /api/applications -> http://localhost:8083/api/applications
 
export async function createApplication(
  request: CreateApplicationRequest,
): Promise<CreateApplicationResponse> {
  const response = await fetch("/api/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errors: ApplicationValidationErrors = {};

    try {
      const body = (await response.json()) as {
        errors?: ApplicationValidationErrors;
      };

      errors = body.errors ?? {};
    } catch {
      // Backend did not return a JSON error body.
    }

    throw new ApplicationApiError(
      response.status,
      response.status === 400
        ? "Ansökan innehåller ogiltiga uppgifter."
        : "Ansökan kunde inte skickas. Försök igen.",
      errors,
    );
  }

  return (await response.json()) as CreateApplicationResponse;
}