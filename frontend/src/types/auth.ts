export type LoginMethod = 'bankid' | 'handlaggare'

export interface AuthState {
  isAuthenticated: boolean
  loginMethod: LoginMethod | null
  companyDisplayName: string
}
