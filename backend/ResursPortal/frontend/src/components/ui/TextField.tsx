import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import styles from './TextField.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /**
   * Optional secondary hint shown on the same row as the label, right-
   * aligned — e.g. a format example like "XXXXXX-XXXX" for an org number.
   * Purely visual guidance; doesn't replace helperText/error, which still
   * render below the field as before.
   */
  labelHint?: string
  /**
   * Optional leading icon rendered inside the field, before the value —
   * same shared-component pattern as Button's `icon` prop. Pass an
   * `<Icon name="..." />`. Purely decorative (aria-hidden lives on Icon
   * itself); doesn't change the field's accessible name or description.
   */
  icon?: ReactNode
  /** Optional small control at the right end of the label row (e.g. a
   * sign toggle). Must be its own focusable element with its own name. */
  labelAction?: ReactNode
  helperText?: string
  /** Optional unit shown inside the field's trailing edge, e.g. "SEK".
   * Announced to assistive tech via aria-describedby. */
  suffix?: string
  error?: string
  /** 'attention' shows the error in amber instead of red: for a value that
   * is simply not filled in yet, as opposed to one that is wrong. */
  errorTone?: 'error' | 'attention'
  required?: boolean
  /**
   * When every field in a form is required, a per-field "*" carries no
   * information — there's nothing to contrast it against. Pass this to
   * suppress the visual mark while the field stays `required` for native/
   * assistive-tech purposes; the caller should instead state once, near
   * the form, that all fields are required.
   */
  hideRequiredMark?: boolean
  /** Announce the message when it changes (e.g. an error raised on blur),
   * not only when the field is focused again. */
  announceMessage?: boolean
}

export function TextField({
  label,
  labelHint,
  icon,
  labelAction,
  helperText,
  suffix,
  error,
  errorTone = 'error',
  required,
  hideRequiredMark,
  announceMessage = false,
  id,
  className = '',
  style,
  ...rest
}: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const message = error ?? helperText
  const messageId = message ? `${inputId}-message` : undefined
  const suffixId = suffix ? `${inputId}-suffix` : undefined
  const describedBy = [suffixId, messageId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && !hideRequiredMark ? '*' : ''}
        </label>
        {labelHint ? <span className={styles.labelHint}>{labelHint}</span> : null}
        {labelAction}
      </div>
      <div className={styles.inputWrap}>
        {icon ? (
          <span className={styles.inputIcon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {suffix ? (
          <span id={suffixId} className={styles.inputSuffix}>
            {suffix}
          </span>
        ) : null}
        <input
  id={inputId}
  {...rest}
  required={required}
  style={{
    ...(icon ? { paddingLeft: '2.75rem' } : null),
    ...(suffix ? { paddingRight: '3.5rem' } : null),
    ...style,
  }}
  aria-invalid={Boolean(error)}
  aria-describedby={describedBy}
  className={`${styles.input}${error ? ` ${errorTone === 'attention' ? styles.inputAttention : styles.inputError}` : ''}`}
/>
      </div>

{message ? (
  <p
    id={messageId}
    aria-live={announceMessage ? 'polite' : undefined}
    className={`${styles.message} ${error ? (errorTone === 'attention' ? styles.messageAttention : styles.messageError) : styles.messageHelp}`}
  >
    {message}
  </p>
) : null}
    </div>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
}

export function TextArea({ label, helperText, error, id, className = '', 'aria-describedby': extraDescribedBy, ...rest }: TextAreaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const message = error ?? helperText
  const messageId = message && inputId ? `${inputId}-message` : undefined
  const describedBy = [messageId, extraDescribedBy].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      {label ? (
        <div className={styles.labelRow}>
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        </div>
      ) : null}
      <textarea
        id={inputId}
        {...rest}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`${styles.textarea}${error ? ` ${styles.inputError}` : ''}`}
      />
      {message ? (
        <p id={messageId} className={`${styles.message} ${error ? styles.messageError : styles.messageHelp}`}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
