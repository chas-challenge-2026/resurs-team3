/**
 * Amount inputs accept what people paste from an annual report:
 * "1 250 000", "1\u00a0250\u00a0000" or a typographic minus. They are
 * stored as plain integer strings ("1250000", "-40000") so validation,
 * scoring and the mapper keep working on the same shape as before.
 */
export function normalizeAmountInput(value: string): string {
  return value.replace(/[\s\u00a0\u202f]/g, '').replace(/\u2212/g, '-')
}

export function isWholeKronor(raw: string): boolean {
  return /^-?\d+$/.test(raw)
}

export function formatAmountInput(raw: string): string {
  if (!isWholeKronor(raw)) return raw
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(Number(raw))
}
