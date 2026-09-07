import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  icon?: ReactNode
}

export function Button({ variant = 'primary', icon, className = '', children, ...rest }: ButtonProps) {
  const base =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-resurs-panel disabled:cursor-not-allowed disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-resurs-orange text-resurs-onOrange hover:bg-resurs-orangeDark focus:ring-resurs-orange'
      : 'bg-transparent text-white border border-white/30 hover:bg-white/10 focus:ring-white/40'

  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  )
}
