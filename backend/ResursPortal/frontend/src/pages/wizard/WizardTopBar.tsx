import { useAuth } from '../../context/useAuth'
import { Button } from '../../components/ui/Button'

interface WizardTopBarProps {
  title: string
}

/** Mirrors BackofficeTopBar's avatar/logout treatment so the applicant and
 * caseworker shells read as the same product. */
export function WizardTopBar({ title }: WizardTopBarProps) {
  const { state, logout } = useAuth()
  const initial = state.companyDisplayName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-extrabold text-white sm:text-2xl">{title}</h1>
      <div className="flex items-center gap-3">
        <div
          role="img"
          aria-label={state.companyDisplayName}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-resurs-orange text-sm font-bold text-resurs-onOrange"
        >
          {initial}
        </div>
        <span className="hidden text-sm text-white/90 sm:inline">{state.companyDisplayName}</span>
        <Button variant="primary" onClick={logout} className="px-3 py-1.5 text-xs">
          Logga ut
        </Button>
      </div>
    </div>
  )
}
