import { useContext } from 'react'
import { CasesContext } from './cases-context'

export function useCases() {
  const ctx = useContext(CasesContext)
  if (!ctx) {
    throw new Error('useCases must be used within a CasesProvider')
  }
  return ctx
}
