/**
 * Document types an applicant can send and a case worker can request.
 * The backend (DocumentService.java) stores docType as given and only
 * reacts to "årsredovisning": uploading one while the case is PENDING_DOCS
 * moves it back to UNDER_REVIEW. Scoring never requests documents itself.
 */
export const DOCUMENT_CATEGORIES = ['Årsredovisning', 'Resultatrapport', 'Balansrapport', 'Kassaflödesanalys', 'Övrigt'] as const

/** docType as DocumentService.java compares it ("årsredovisning"). */
export function toBackendDocType(category: string): string {
  return category.toLocaleLowerCase('sv-SE')
}
