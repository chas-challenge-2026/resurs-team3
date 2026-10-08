export function formatSEK(value: number): string {
  return `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value)} kr`
}

/**
 * Same value as formatSEK, split into the digits and the unit so callers
 * can style them separately — e.g. right-align + tabular-nums on the
 * amount while keeping "kr" from wrapping onto its own line in a narrow
 * column.
 */
export function formatSEKParts(value: number): { amount: string; unit: string } {
  return {
    amount: new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value),
    unit: 'kr',
  }
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }).format(
    new Date(iso),
  )
}
