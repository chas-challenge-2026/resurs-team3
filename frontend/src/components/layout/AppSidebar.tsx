import type { ReactNode } from 'react'
import { Logo } from '../Logo'
import { Symbol } from '../Symbol'
import { BrandBlob } from '../BrandBlob'

export interface SidebarItem {
  key: string
  label: string
  icon: ReactNode
  /** Unread/pending count shown as a small badge on the icon. Omit or 0 to hide it. */
  badge?: number
}

interface NavButtonProps {
  label: string
  icon: ReactNode
  active: boolean
  badge?: number
  onClick?: () => void
}

function NavButton({ label, icon, active, badge, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={`flex min-h-[44px] w-full items-center justify-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-resurs-orange focus:ring-offset-2 focus:ring-offset-resurs-sidebar lg:justify-start lg:px-3 ${
        active ? 'bg-resurs-card text-white font-semibold' : 'text-white/80 hover:bg-white/5'
      }`}
    >
      <span className="relative shrink-0 text-base" aria-hidden="true">
        {icon}
        {badge ? (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-resurs-orange px-1 text-[10px] font-bold leading-none text-resurs-onOrange">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>
      <span className="hidden lg:inline">{label}</span>
      {badge ? (
        <span className="ml-auto hidden rounded-full bg-resurs-orange px-1.5 py-0.5 text-[10px] font-bold text-resurs-onOrange lg:inline">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  )
}

interface AppSidebarProps {
  items: SidebarItem[]
  activeKey: string
  onSelect?: (key: string) => void
}

/** Shared sidebar shell used by both the applicant wizard and the caseworker backoffice. */
export function AppSidebar({ items, activeKey, onSelect }: AppSidebarProps) {
  return (
    <aside className="relative w-16 shrink-0 overflow-hidden bg-resurs-sidebar transition-[width] lg:w-[450px]">
      <BrandBlob width={300} color="rgba(255,255,255,0.05)" />
      <div className="relative z-10 p-3 lg:p-6">
        <div className="hidden w-full lg:block" style={{ maxWidth: 332, aspectRatio: '332 / 177' }}>
          <Logo width="100%" height="100%" />
        </div>
        <div className="flex justify-center lg:hidden">
          <Symbol size={28} />
        </div>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Huvudmeny">
          {items.map((item) => (
            <NavButton
              key={item.key}
              label={item.label}
              icon={item.icon}
              active={item.key === activeKey}
              badge={item.badge}
              onClick={onSelect ? () => onSelect(item.key) : undefined}
            />
          ))}
        </nav>
      </div>
    </aside>
  )
}
