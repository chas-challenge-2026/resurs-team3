import { useEffect } from 'react'

const SUFFIX = 'Resurs Direkt'

/**
 * Sets the browser tab title. Screen readers announce it when a page loads
 * and list it among open tabs, so it names where the user is, e.g.
 * "Steg 2 av 4: Ekonomi – Ansök om företagskredit – Resurs Direkt".
 */
export function useDocumentTitle(...parts: Array<string | false | null | undefined>) {
  const title = [...parts.filter(Boolean), SUFFIX].join(' – ')
  useEffect(() => {
    document.title = title
  }, [title])
}
