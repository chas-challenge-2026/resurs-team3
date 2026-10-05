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
  helperText?: string
  error?: string
  required?: boolean
  /**
   * When every field in a form is required, a per-field "*" carries no
   * information — there's nothing to contrast it against. Pass this to
   * suppress the visual mark while the field stays `required` for native/
   * assistive-tech purposes; the caller should instead state once, near
   * the form, that all fields are required.
   */
  hideRequiredMark?: boolean
}

export function TextField({
  label,
  labelHint,
  icon,
  helperText,
  error,
  required,
  hideRequiredMark,
  id,
  className = '',
  style,
  ...rest
}: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const message = error ?? helperText
  const messageId = message ? `${inputId}-message` : undefined
  return (
    <div className={className}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && !hideRequiredMark ? '*' : ''}
        </label>
        {labelHint ? <span className={styles.labelHint}>{labelHint}</span> : null}
      </div>
      <div className={styles.inputWrap}>
        {icon ? (
          <span className={styles.inputIcon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
  id={inputId}
  {...rest}
  required={required}
  style={icon ? { paddingLeft: '2.75rem', ...style } : style}
  aria-invalid={Boolean(error)}
  aria-describedby={messageId}
  className={`${styles.input}${error ? ` ${styles.inputError}` : ''}`}
/>
      </div>

{message ? (
  <p
    id={messageId}
    className={`${styles.message} ${error ? styles.messageError : styles.messageHelp}`}
  >
    {message}
  </p>
) : null}
    </div>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function TextArea({
  label,
  error,
  id,
  className = '',
  ...rest
}: TextAreaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const messageId = error ? `${inputId}-error` : undefined
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
        aria-describedby={messageId}
        className="w-full rounded-md bg-resurs-input text-gray-800 placeholder:text-gray-500 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-resurs-orange min-h-24 sm:py-2 sm:text-sm"
            />

      {error ? (
        <p id={messageId} className={styles.helperText}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
