import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import styles from './TextField.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
  required?: boolean
}

export function TextField({ label, helperText, required, id, className = '', ...rest }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={className}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
        {required ? '*' : ''}
      </label>
      <input id={inputId} className={styles.input} {...rest} />
      {helperText ? <p className={styles.helperText}>{helperText}</p> : null}
    </div>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function TextArea({ label, id, className = '', ...rest }: TextAreaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      ) : null}
      <textarea id={inputId} className={styles.textarea} {...rest} />
    </div>
  )
}
