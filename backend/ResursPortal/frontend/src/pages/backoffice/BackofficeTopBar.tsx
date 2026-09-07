import { useAuth } from '../../context/useAuth'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/Icon'

interface BackofficeTopBarProps {
  search: string
  onSearchChange: (value: string) => void
}

export function BackofficeTopBar({ search, onSearchChange }: BackofficeTopBarProps) {
  const { state, logout } = useAuth()
  const initial = state.companyDisplayName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="flex items-center gap-3">
      <div className="relative min-w-0 flex-1 max-w-sm">
        <label htmlFor="case-search" className="sr-only">
          Sök företag eller org.nummer
        </label>
        <input
          id="case-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sök företag eller org.nummer"
          className="w-full rounded-md bg-resurs-input py-2.5 pl-3 pr-9 text-base text-gray-800 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-resurs-orange sm:py-2 sm:text-sm"
        />
        <Icon
          name="search"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
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
