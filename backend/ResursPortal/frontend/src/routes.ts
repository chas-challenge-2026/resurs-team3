/**
 * Every URL in the app, in Swedish and without å/ä/ö (those are
 * percent-encoded when a link is copied, e.g. /kreditans%C3%B6kan).
 */
export const ROUTES = {
  login: '/logga-in',
  wizard: '/kreditansokan',
  overview: '/oversikt',
  documents: '/mina-handlingar',
  application: '/ansokan',
} as const

/** One wizard step, e.g. /kreditansokan/steg-2. */
export function wizardStepPath(step: number) {
  return `${ROUTES.wizard}/steg-${step}`
}

/** Reads the step number from the :steg segment ("steg-2" → 2). */
export function parseWizardStep(segment: string | undefined, total: number): number | null {
  const match = /^steg-(\d+)$/.exec(segment ?? '')
  const step = match ? Number(match[1]) : NaN
  return Number.isInteger(step) && step >= 1 && step <= total ? step : null
}
