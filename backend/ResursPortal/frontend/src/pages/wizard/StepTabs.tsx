import { Icon } from '../../components/Icon'

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
    <div className="grid grid-cols-3 gap-1 rounded-md bg-resurs-panel p-1" role="tablist" aria-label="Ansökningssteg">
      {STEPS.map(({ step, label }) => {
        const active = step === currentStep
        const completed = step < currentStep
        const reachable = step <= currentStep

        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={!reachable}
            onClick={() => onSelectStep(step)}
            className={`min-h-[44px] min-w-0 flex-1 truncate rounded-md px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
              active
                ? 'bg-resurs-orange text-resurs-onOrange'
                : completed
                  ? 'text-resurs-orange hover:text-resurs-yellow'
                  : reachable
                    ? 'text-white/80 hover:text-white'
                    : 'cursor-not-allowed text-white/30'
            }`}
          >
            {completed ? <Icon name="check" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" /> : null}
            {label}
          </button>
        )
      })}
    </div>
  )
}
