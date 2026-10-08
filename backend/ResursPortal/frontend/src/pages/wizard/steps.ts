export interface StepTab {
  step: number
  label: string
}

/** The wizard's four steps, named the same in tabs, headings and review. */
export const STEPS: StepTab[] = [
  { step: 1, label: 'Företag' },
  { step: 2, label: 'Ekonomi' },
  { step: 3, label: 'Kredit' },
  { step: 4, label: 'Granska' },
]
