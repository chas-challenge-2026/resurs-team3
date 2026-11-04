import { useState, type KeyboardEvent } from 'react'
import { TextField } from '../../components/ui/TextField'
import { formatAmountInput, normalizeAmountInput } from './amount'
import styles from './AmountField.module.css'

interface AmountFieldProps {
  id: string
  label: string
  value: string
  onChange: (raw: string) => void
  error?: string
  /** See TextField: amber for "not filled in yet", red for "wrong". */
  errorTone?: 'error' | 'attention'
  helperText?: string
  /** Called when the field loses focus, e.g. to check a range early. */
  onBlur?: () => void
  allowNegative?: boolean
  className?: string
}

const isTouch = () => window.matchMedia?.('(pointer: coarse)')?.matches ?? false

/** On phones the keyboard's enter key says "next" and moves to the next
 * field instead of submitting the step; the last field still submits. */
function focusNextField(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== 'Enter' || !isTouch()) return
  const form = event.currentTarget.form
  if (!form) return
  const fields = [...form.querySelectorAll<HTMLElement>('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not(:disabled), select, textarea')]
  const next = fields[fields.indexOf(event.currentTarget) + 1]
  if (next) {
    event.preventDefault()
    next.focus()
  }
}

/**
 * Whole-kronor input: shows "1 250 000 SEK" at rest, keeps exactly what the
 * user typed while focused (so the caret never jumps), and reports a
 * normalized integer string upward.
 */
export function AmountField({ id, label, value, onChange, error, errorTone, helperText, onBlur, allowNegative = false, className }: AmountFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const negative = value.trim().startsWith('-')

  // The numeric keypad (iOS, most Android) has no minus key. Rather than
  // fall back to the full keyboard, fields that may be negative get a
  // sign toggle, shown on touch screens only (desktop users type "-").
  const signToggle = allowNegative ? (
    <button
      type="button"
      className={styles.signToggle}
      aria-pressed={negative}
      aria-label={`Negativt belopp för ${label.toLowerCase()}`}
      onClick={() => {
        const digits = value.replace(/^-/, '')
        const next = negative ? digits : digits ? `-${digits}` : '-'
        setDraft(null)
        onChange(next)
      }}
    >
      {negative ? '− Negativt' : '± Minus'}
    </button>
  ) : undefined

  return (
    <TextField
      id={id}
      label={label}
      labelAction={signToggle}
      type="text"
      inputMode="numeric"
      enterKeyHint="next"
      autoComplete="off"
      required
      hideRequiredMark
      suffix="SEK"
      className={className}
      value={draft ?? formatAmountInput(value)}
      error={error}
      errorTone={errorTone}
      // A range error raised on blur is read out when it appears.
      announceMessage={Boolean(onBlur)}
      helperText={helperText}
      onKeyDown={focusNextField}
      onFocus={() => setDraft(formatAmountInput(value))}
      onBlur={() => { setDraft(null); onBlur?.() }}
      onChange={(event) => {
        setDraft(event.target.value)
        onChange(normalizeAmountInput(event.target.value))
      }}
    />
  )
}
