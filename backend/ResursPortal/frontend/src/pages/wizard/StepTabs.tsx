import styles from './StepTabs.module.css'
import { STEPS } from './steps'

interface StepTabsProps {
  currentStep: number
  /** Furthest step reached so far. */
  maxReachedStep: number
  /** Steps whose current data passes validation. */
  validSteps: number[]
  /** Signing is open: the last step reads "Signera" instead of "Granska". */
  signing?: boolean
}

/**
 * Progress for the whole wizard, the same on every screen size: "Steg N av 4"
 * with the step's name and one bar. Moving between steps goes through
 * Tillbaka/Nästa, the review's Ändra and the browser's Back.
 */
export function StepTabs({ currentStep, maxReachedStep, validSteps, signing = false }: StepTabsProps) {
  const currentIndex = Math.max(0, STEPS.findIndex(({ step }) => step === currentStep))
  const total = STEPS.length
  const label = signing && currentIndex === total - 1 ? 'Signera' : STEPS[currentIndex]?.label
  // Steps 1–3 fill a quarter each. The review stops just short of full, so
  // the bar only reads as finished once signing is under way.
  const fill = currentIndex === total - 1 && !signing ? (total - 0.5) / total : (currentIndex + 1) / total
  const attentionLabels = STEPS
    .filter(({ step }) => step !== currentStep && step < maxReachedStep && !validSteps.includes(step))
    .map(({ label: stepLabel }) => stepLabel)

  return (
    <div className={styles.progress}>
      <p className={styles.text} id="wizard-progress-label">
        <span>Steg {currentIndex + 1} av {total}</span>
        <span className={styles.label}>{label}</span>
        {attentionLabels.length > 0 ? (
          <span className={styles.attention}>{attentionLabels.join(', ')} behöver kompletteras</span>
        ) : null}
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-labelledby="wizard-progress-label"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={currentIndex + 1}
        aria-valuetext={`Steg ${currentIndex + 1} av ${total}: ${label}`}
      >
        <div className={styles.fill} style={{ width: `${fill * 100}%` }} />
      </div>
    </div>
  )
}
