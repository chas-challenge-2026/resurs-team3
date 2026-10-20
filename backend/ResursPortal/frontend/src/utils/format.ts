export function formatSEK(value: number): string {
  if (!Number.isFinite(value)) return '—'
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
  // An unparseable date would throw (RangeError) and take the whole view down.
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

/** "över 2.0" → "över 2,0": Swedish decimals in display text (scoring notes
 * keep the backend's own format; this only changes how they are shown). */
export function swedishDecimals(text: string): string {
  return text.replace(/(\d)\.(\d)/g, '$1,$2')
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
