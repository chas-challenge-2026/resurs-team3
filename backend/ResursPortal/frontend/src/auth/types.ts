export type UserRole = 'admin' | 'client'

export interface AdminUser {
  role: 'admin'
  id: string
  name: string
  email: string
}

export interface ClientUser {
  role: 'client'
  id: string
  orgNumber: string
  companyName: string
  authorizedSignatory?: string
}

export type AuthUser = AdminUser | ClientUser
