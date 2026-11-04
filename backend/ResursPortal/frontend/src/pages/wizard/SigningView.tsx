import { useEffect, useRef, useState, type Ref } from 'react'
import { BankIdMark } from '../../components/BankIdMark'
import { Button } from '../../components/ui/Button'
import styles from './SigningView.module.css'

type SigningMethod = 'this-device' | 'qr'

interface SigningViewProps {
  companyName: string
  signatory: string
  amountText: string
  termText: string
  /** Estimated monthly cost, e.g. "15 784 SEK"; '' when unknown. */
  monthlyText: string
  /** True while the signature is being verified after "Jag har signerat". */
  checking: boolean
  headingRef: Ref<HTMLHeadingElement>
  /** The signatory's attestation; BankID opens only once it is given. */
  attested: boolean
  onAttestedChange: (attested: boolean) => void
  onConfirm: () => void
  /** Back to the review. A quiet link in the card, not a bar button. */
  onCancel: () => void
}

/**
 * Step 4's signing moment. It replaces the review while it is open: the
 * four facts being signed, then a BankID start choice as in real BankID
 * ("på den här enheten" or "Mobilt BankID" with a QR code that refreshes).
 * The QR code is a decorative mock; the text carries the instruction.
 */
export function SigningView({ companyName, signatory, amountText, termText, monthlyText, checking, headingRef, attested, onAttestedChange, onConfirm, onCancel }: SigningViewProps) {
  const [method, setMethod] = useState<SigningMethod | null>(null)
  const instructionRef = useRef<HTMLHeadingElement>(null)
  const firstChoiceRef = useRef<HTMLButtonElement>(null)
  const skipFirstFocusRef = useRef(true)

  // The choice buttons disappear when one is picked (and come back on
  // "Byt sätt"), so focus moves with the content instead of being lost.
  useEffect(() => {
    if (skipFirstFocusRef.current) {
      skipFirstFocusRef.current = false
      return
    }
    if (method) instructionRef.current?.focus()
    else firstChoiceRef.current?.focus()
  }, [method])

  const status = checking
    ? 'Kontrollerar signaturen…'
    : !attested
      ? 'Intyga uppgifterna för att gå vidare till BankID.'
      : method === 'this-device'
      ? 'Väntar på signering i BankID-appen på den här enheten…'
      : method === 'qr'
        ? 'Väntar på signering. Skanna QR-koden med BankID-appen.'
        : 'Välj hur ni vill starta BankID.'

  return (
    <section className={styles.view} aria-labelledby="signing-heading">
      {/* One live region for every state; the visible versions sit where
          each state happens (below the box, next to the button). */}
      <p className={styles.srOnly} role="status">{status}</p>
      <div className={styles.header}>
        <BankIdMark height={40} decorative />
        <h2 id="signing-heading" ref={headingRef} tabIndex={-1} className={styles.title}>Intyga och signera med BankID</h2>
      </div>

      {/* The commitment first: what is being applied for, in one line. */}
      <div className={styles.commitment}>
        <p className={styles.commitmentLine}>
          Ni ansöker om <strong className={styles.nowrap}>{amountText}</strong> över <strong className={styles.nowrap}>{termText}</strong>
        </p>
        {monthlyText ? <p className={styles.commitmentNote}>Ca {monthlyText} i månaden enligt exemplet. Villkoren fastställs efter kreditprövningen.</p> : null}
      </div>

      <dl className={styles.facts} aria-label="Det här signerar ni">
        <div><dt>Företag</dt><dd>{companyName}</dd></div>
        <div><dt>Firmatecknare</dt><dd>{signatory}</dd></div>
      </dl>

      {/* One sentence, one box, right above BankID: what the signature
          means is read at the moment it is given. */}
      <div className={styles.attestation}>
        <label className={styles.attestRow}>
          <input
            id="field-attestation"
            type="checkbox"
            className={styles.attestCheckbox}
            checked={attested}
            // Not disabled while the signature is checked (a disabled box
            // turns grey); changes are just ignored then.
            aria-disabled={checking || undefined}
            onChange={(event) => {
              if (checking) return
              onAttestedChange(event.target.checked)
              if (!event.target.checked) setMethod(null)
            }}
          />
          <span>
            Jag, {signatory || 'firmatecknaren'}, intygar att uppgifterna stämmer med företagets senast fastställda årsredovisning
            och att jag är behörig firmatecknare för {companyName || 'företaget'}.
          </span>
        </label>
        <p className={styles.note}>Uppgifterna omfattas av banksekretess och används bara för kreditprövningen.</p>
      </div>

      {/* The BankID choices are always in view, so the way forward is
          visible; until the box is ticked they are off and say why. */}
      {method === null ? (
        <div className={styles.choices} role="group" aria-labelledby="signing-choice-title">
          <p id="signing-choice-title" className={styles.choiceTitle}>
            {attested ? 'Hur vill ni starta BankID?' : 'Kryssa i rutan ovan för att starta BankID'}
          </p>
          <button ref={firstChoiceRef} type="button" disabled={!attested} className={`${styles.choice} ${styles.choiceThisDevice}`} onClick={() => setMethod('this-device')}>
            <span className={styles.choiceName}>BankID på den här enheten</span>
            <span className={styles.choiceHint}>BankID-appen öppnas här</span>
          </button>
          <button type="button" disabled={!attested} className={styles.choice} onClick={() => setMethod('qr')}>
            <span className={styles.choiceName}>Mobilt BankID</span>
            <span className={styles.choiceHint}>Skanna en QR-kod med en annan enhet</span>
          </button>
        </div>
      ) : (
        <div className={styles.waiting}>
          {method === 'qr' ? <MockQrCode paused={checking} /> : null}
          <div className={styles.waitingText}>
            <h3 ref={instructionRef} tabIndex={-1} className={styles.instructionTitle}>
              {method === 'qr' ? 'Skanna QR-koden med BankID-appen' : 'Signera i BankID-appen'}
            </h3>
            <p className={styles.instruction}>
              {method === 'qr'
                ? 'Öppna BankID-appen på telefonen, tryck på QR-ikonen och rikta kameran mot koden.'
                : `Bekräfta signeringen i BankID-appen som ${signatory}.`}
            </p>
            <div className={styles.waitingActions}>
              <Button type="button" className={styles.confirmButton} onClick={onConfirm} disabled={checking}>
                Jag har signerat
              </Button>
              {checking ? (
                <span className={styles.checking} aria-hidden="true">
                  <span className={styles.spinner} />Kontrollerar signaturen…
                </span>
              ) : (
                <button type="button" className={styles.switchLink} onClick={() => setMethod(null)}>
                  Byt sätt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button type="button" className={styles.cancelLink} onClick={onCancel} disabled={checking}>
        Avbryt och gå tillbaka till granskningen
      </button>
    </section>
  )
}

const QR_SIZE = 25

/** Seeded pseudo-random modules plus the three finder squares: reads as a
 * QR code without encoding anything. Changes every second, like BankID's
 * animated QR; the swap is instant, so there is no motion to reduce. */
function MockQrCode({ paused }: { paused: boolean }) {
  const [seed, setSeed] = useState(1)

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => setSeed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [paused])

  const cells: Array<[number, number]> = []
  let state = seed * 2654435761
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (inFinder(x, y)) continue
      state = (state * 1103515245 + 12345) % 2147483648
      if (state % 7 < 3) cells.push([x, y])
    }
  }

  return (
    <div className={styles.qr} aria-hidden="true">
      <svg viewBox={`-2 -2 ${QR_SIZE + 4} ${QR_SIZE + 4}`} shapeRendering="crispEdges">
        <rect x={-2} y={-2} width={QR_SIZE + 4} height={QR_SIZE + 4} fill="#fff" />
        {[[0, 0], [QR_SIZE - 7, 0], [0, QR_SIZE - 7]].map(([fx, fy]) => (
          <g key={`${fx}-${fy}`}>
            <rect x={fx} y={fy} width={7} height={7} fill="#0a2422" />
            <rect x={fx + 1} y={fy + 1} width={5} height={5} fill="#fff" />
            <rect x={fx + 2} y={fy + 2} width={3} height={3} fill="#0a2422" />
          </g>
        ))}
        {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0a2422" />)}
      </svg>
    </div>
  )
}

function inFinder(x: number, y: number) {
  const near = (v: number, start: number) => v >= start - 1 && v <= start + 7
  return (near(x, 0) && near(y, 0)) || (near(x, QR_SIZE - 7) && near(y, 0)) || (near(x, 0) && near(y, QR_SIZE - 7))
}
