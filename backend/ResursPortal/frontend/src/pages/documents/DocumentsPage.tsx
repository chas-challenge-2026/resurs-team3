import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useCases } from '../../context/useCases'
import type { CaseDocument, CreditCase } from '../../types/case'
import { DOCUMENT_CATEGORIES } from '../../features/credit-application/documentRules'
import { applicationStatusPath } from '../status/applicationProgress'
import styles from './DocumentsPage.module.css'
import { STATUS_LABEL } from '../../features/credit-application/statusLabels'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ROUTES } from '../../routes'

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]


function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium' }).format(date)
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(amount)
}

function ApplicationOption({ application }: { application: CreditCase }) {
  return <>{application.id.toUpperCase()} · {formatAmount(application.amount)} SEK · {STATUS_LABEL[application.status]}</>
}

export function DocumentsPage() {
  useDocumentTitle('Mina handlingar')
  const { user } = useAuth()
  const { cases, addDocuments } = useCases()
  const [searchParams] = useSearchParams()
  const companyCases = useMemo(() => {
    if (user?.role !== 'client') return []
    return cases
      .filter((item) => item.orgNumber === user.orgNumber || item.companyName === user.companyName)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }, [cases, user])
  // ?ansokan=c-1005 preselects an application (links from the portal and
  // the wizard).
  const [selectedApplicationId, setSelectedApplicationId] = useState(() => searchParams.get('ansokan') ?? '')
  const [category, setCategory] = useState<DocumentCategory>('Årsredovisning')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  // File contents only live in this session; metadata is saved on the case.
  const [sessionFiles, setSessionFiles] = useState<Record<string, File>>({})
  const [error, setError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const selectedApplication =
    companyCases.find((item) => item.id === selectedApplicationId) ??
    companyCases[0]
  const currentDocuments: CaseDocument[] = selectedApplication?.documents ?? []
  const totalDocuments = companyCases.reduce((sum, item) => sum + (item.documents?.length ?? 0), 0)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError('')
    const files = Array.from(event.target.files ?? [])
    const tooLarge = files.find((file) => file.size > 15 * 1024 * 1024)
    if (tooLarge) {
      setSelectedFiles([])
      setError('Varje fil får vara högst 15 MB.')
      event.target.value = ''
      return
    }
    setSelectedFiles(files)
  }

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedApplication) return
    if (selectedFiles.length === 0) {
      setError('Välj minst en fil att lägga till.')
      return
    }

    const addedAt = new Date().toISOString()
    const additions: CaseDocument[] = selectedFiles.map((file, index) => ({
      id: `doc-${Date.now()}-${index}`,
      category,
      fileName: file.name,
      size: file.size,
      uploadedAt: addedAt,
    }))
    setSessionFiles((previous) => ({
      ...previous,
      ...Object.fromEntries(additions.map((doc, index) => [doc.id, selectedFiles[index]])),
    }))
    addDocuments(selectedApplication.id, additions)
    setSentMessage(`${additions.length} ${additions.length === 1 ? 'dokument skickat' : 'dokument skickade'} med ansökan ${selectedApplication.id.toUpperCase()}.`)
    setSelectedFiles([])
    setError('')
    const input = event.currentTarget.querySelector('input[type="file"]')
    if (input instanceof HTMLInputElement) input.value = ''
  }

  function handleDownload(document: CaseDocument) {
    const file = sessionFiles[document.id]
    if (!file) return
    const url = URL.createObjectURL(file)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = document.fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.documentsPage}>
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.breadcrumb}>Kundportal&nbsp; / &nbsp;Mina handlingar</p>
          <h1>Mina handlingar</h1>
          <p className={styles.intro}>Samla dokument och underlag kopplade till företagets kreditansökningar.</p>
        </div>
        {selectedApplication ? <span className={styles.documentCount}>{totalDocuments} {totalDocuments === 1 ? 'skickad fil' : 'skickade filer'}</span> : null}
      </div>

      {companyCases.length === 0 ? (
        <section className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">▤</span>
          <h2>Inga ansökningar att visa</h2>
          <p>När företaget har en kreditansökan kan du lägga till och samla underlag här.</p>
          <Link to={ROUTES.wizard} className={styles.primaryLink}>Starta en kreditansökan <span aria-hidden="true">→</span></Link>
        </section>
      ) : (
        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            {sentMessage ? (
              <p className={styles.sentMessage} role="status">
                {sentMessage} <Link to={applicationStatusPath(selectedApplication?.id ?? '')}>Följ ansökan</Link>
              </p>
            ) : null}
            <section className={styles.uploadCard}>
              <div className={styles.cardHeading}>
                <span className={styles.headingIcon} aria-hidden="true">↑</span>
                <div><h2>Lägg till dokument</h2><p>Välj ansökan och dokumenttyp för dina filer.</p></div>
              </div>

              <form onSubmit={handleUpload}>
                <div className={styles.fieldsGrid}>
                  <label className={styles.field}>
                    <span>Kreditansökan</span>
                    <select value={selectedApplication?.id ?? ''} onChange={(event) => { setSelectedApplicationId(event.target.value); setSentMessage('') }}>
                      {companyCases.map((application) => <option key={application.id} value={application.id}><ApplicationOption application={application} /></option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Dokumenttyp</span>
                    <select value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
                      {DOCUMENT_CATEGORIES.map((name) => <option key={name}>{name}</option>)}
                    </select>
                  </label>
                </div>

                <label className={styles.filePicker} htmlFor="supporting-documents">
                  <span className={styles.fileIcon} aria-hidden="true">＋</span>
                  <strong>{selectedFiles.length ? `${selectedFiles.length} ${selectedFiles.length === 1 ? 'fil vald' : 'filer valda'}` : 'Välj filer att lägga till'}</strong>
                  <span>PDF, JPG, PNG, XLS eller XLSX · max 15 MB per fil</span>
                  <input id="supporting-documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleFileChange} />
                </label>

                {selectedFiles.length > 0 ? (
                  <ul className={styles.selectedFiles}>
                    {selectedFiles.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}<span>{formatFileSize(file.size)}</span></li>)}
                  </ul>
                ) : null}
                {error ? <p className={styles.error} role="alert">{error}</p> : null}
                <button type="submit" className={styles.primaryButton} disabled={selectedFiles.length === 0}>Skicka med ansökan</button>
              </form>
              <p className={styles.sessionNote}>I prototypen sparas filernas namn och storlek på ansökan. Själva filerna går bara att hämta under den här sessionen.</p>
            </section>

            <section className={styles.listCard}>
              <div className={styles.sectionHeading}>
                <div><h2>Skickade dokument</h2><p>Filer som har skickats med vald ansökan.</p></div>
                <span className={styles.count}>{currentDocuments.length}</span>
              </div>
              {currentDocuments.length ? (
                <ul className={styles.documentList}>
                  {currentDocuments.map((document) => (
                    <li key={document.id} className={styles.documentItem}>
                      <span className={styles.documentIcon} aria-hidden="true">▧</span>
                      <div className={styles.documentInfo}>
                        <strong>{document.fileName}</strong>
                        <span>{document.category} · {formatFileSize(document.size)} · Skickad {formatDate(document.uploadedAt)}</span>
                      </div>
                      {sessionFiles[document.id] ? (
                        <button type="button" className={styles.textButton} onClick={() => handleDownload(document)}>Hämta</button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.emptyDocuments}><p>Inga dokument har lagts till för den här ansökan ännu.</p></div>
              )}
            </section>
          </div>

          <aside className={styles.sideColumn} aria-label="Vald ansökan">
            <section className={styles.applicationCard}>
              <p className={styles.eyebrow}>VALD ANSÖKAN</p>
              <h2>{selectedApplication?.id.toUpperCase()}</h2>
              <p>{selectedApplication?.purpose || 'Företagskredit'}</p>
              <div className={styles.applicationDetail}><span>Ansökt belopp</span><strong>{formatAmount(selectedApplication?.amount ?? 0)} SEK</strong></div>
              <div className={styles.applicationDetail}><span>Inskickad</span><strong>{selectedApplication ? formatDate(selectedApplication.submittedAt) : '—'}</strong></div>
              {selectedApplication ? <span className={styles.status}>{STATUS_LABEL[selectedApplication.status]}</span> : null}
            </section>
            <section className={styles.infoCard}>
              <h2>Om dina dokument</h2>
              <p>Lägg till årsredovisningar och andra underlag som hör till vald ansökan. Kontrollera att filerna går att läsa innan du skickar in dem.</p>
              <p className={styles.infoFoot}>Tillåtna format: PDF, JPG, PNG, XLS och XLSX.</p>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
