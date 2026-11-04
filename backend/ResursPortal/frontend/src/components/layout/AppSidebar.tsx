import type { ReactNode } from 'react'
import { Logo } from '../Logo'
import { Symbol } from '../Symbol'
import { BrandBlob } from '../BrandBlob'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/Sidebar'
import { useSidebar } from '@/components/ui/sidebar-context'
import { joinClassNames } from '../../lib/joinClassNames'
import styles from './AppSidebar.module.css'

export interface SidebarItem {
  key: string
  label: string
  icon: ReactNode
  /** Unread/pending count shown as a small badge on the icon. Omit or 0 to hide it. */
  badge?: number
}

interface AppSidebarProps {
  items: SidebarItem[]
  activeKey: string
  onSelect?: (key: string) => void
}

/**
 * Shared sidebar shell used by both the applicant wizard and the caseworker
 * backoffice — built on shadcn's Sidebar primitive (SidebarProvider wraps it
 * one level up, in AppLayout/BackofficeLayout) so it gets real collapse-to-
 * icons on desktop and an off-canvas drawer on mobile, instead of the old
 * fixed icon-strip/full-panel breakpoint.
 */
export function AppSidebar({ items, activeKey, onSelect }: AppSidebarProps) {
  const { state, isMobile } = useSidebar()
  const collapsed = state === 'collapsed'
  // Sidebar.tsx only ever sets data-collapsible="icon" on its desktop
  // (non-mobile) root, so the icon-only-collapse case this badge cares
  // about is specifically "collapsed AND not mobile", not collapsed alone.
  const iconCollapsed = collapsed && !isMobile

  return (
    <Sidebar collapsible="icon" className={styles.sidebarRoot}>
      <BrandBlob width={300} color="rgba(255,255,255,0.05)" />
      <SidebarHeader className={styles.header}>
        {collapsed ? (
          <div className={styles.collapsedLogoWrap}>
            <Symbol size={28} />
          </div>
        ) : (
          <div className={styles.expandedLogoWrap} style={{ maxWidth: 332, aspectRatio: '332 / 177' }}>
            <Logo width="100%" height="100%" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className={styles.content}>
        <SidebarGroup className={styles.group}>
          <SidebarGroupContent>
            <SidebarMenu className={styles.menu}>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={item.key === activeKey}
                    tooltip={item.label}
                    onClick={onSelect ? () => onSelect(item.key) : undefined}
                    className={styles.menuButton}
                  >
                    <span className={styles.menuIcon} aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.badge ? (
                      <SidebarMenuBadge className={joinClassNames(styles.badge, iconCollapsed && styles.badgeHidden)}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
