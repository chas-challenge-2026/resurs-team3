import type { CreditApplicationData } from "./creditApplication.types";

export type CreditDetailsErrors = Partial<
  Record<"requestedAmount" | "purpose", string>
>;

export function validateCreditDetails(
  data: CreditApplicationData,
): CreditDetailsErrors {
  const errors: CreditDetailsErrors = {};

  const requestedAmount = data.requestedAmount.trim();

  if (!requestedAmount) {
    errors.requestedAmount = "Kreditbelopp måste anges.";
  } else if (!Number.isFinite(Number(requestedAmount))) {
    errors.requestedAmount = "Ange ett giltigt nummer.";
  } else if (Number(requestedAmount) <= 0) {
    errors.requestedAmount = "Kreditbeloppet måste vara större än 0.";
  }

  if (!data.purpose.trim()) {
    errors.purpose = "Syfte måste anges.";
  }

  return errors;
}
