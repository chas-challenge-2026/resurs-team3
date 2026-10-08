import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { joinClassNames } from '@/lib/joinClassNames'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  icon?: ReactNode
}

export function Button({ variant = 'primary', icon, className = '', children, ...rest }: ButtonProps) {
  const variantClass = variant === 'primary' ? styles.primary : styles.secondary
  return (
    <button className={joinClassNames(styles.base, variantClass, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
}
