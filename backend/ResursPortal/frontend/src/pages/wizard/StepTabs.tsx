import { Icon } from '../../components/Icon'
import { joinClassNames } from '../../lib/joinClassNames'
import styles from './StepTabs.module.css'

interface StepTab {
  step: number
  label: string
}

const STEPS: StepTab[] = [
  { step: 1, label: '1. Företagsuppgifter' },
  { step: 2, label: '2. Ekonomiska uppgifter' },
  { step: 3, label: '3. Kreditansökan' },
]

interface StepTabsProps {
  currentStep: number
  onSelectStep: (step: number) => void
}

/** A step tab is reachable once the wizard has gotten at least that far —
 * same "currentStep is the high-water mark" rule the step buttons already
 * use, just exposed as a clickable overview instead of only Back/Next. */
export function StepTabs({ currentStep, onSelectStep }: StepTabsProps) {
  return (
    <div className={styles.tabList} role="tablist" aria-label="Ansökningssteg">
      {STEPS.map(({ step, label }) => {
        const active = step === currentStep
        const completed = step < currentStep
        const reachable = step <= currentStep

        const stateClass = active
          ? styles.tabActive
          : completed
            ? styles.tabCompleted
            : reachable
              ? styles.tabReachable
              : styles.tabLocked

        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={!reachable}
            onClick={() => onSelectStep(step)}
            className={joinClassNames(styles.tab, stateClass)}
          >
            {completed ? <Icon name="check" className={styles.checkIcon} /> : null}
            {label}
          </button>
        )
      })}
    </div>
  )
}
