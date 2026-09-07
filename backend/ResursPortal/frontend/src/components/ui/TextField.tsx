import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
  required?: boolean
}

export function TextField({ label, helperText, required, id, className = '', ...rest }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm text-white/90 mb-1.5">
        {label}
        {required ? '*' : ''}
      </label>
      <input
        id={inputId}
        className="w-full rounded-md bg-resurs-input text-gray-800 placeholder:text-gray-500 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-resurs-orange sm:py-2 sm:text-sm"
        {...rest}
      />
      {helperText ? <p className="mt-1 text-xs text-resurs-muted">{helperText}</p> : null}
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
        <label htmlFor={inputId} className="block text-sm text-white/90 mb-1.5">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        className="w-full rounded-md bg-resurs-input text-gray-800 placeholder:text-gray-500 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-resurs-orange min-h-[96px] sm:py-2 sm:text-sm"
        {...rest}
      />
    </div>
  )
}
