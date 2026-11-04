import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { joinClassNames } from '@/lib/joinClassNames'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  /** 'dark' (default) for the forest shell; 'paper' for white panels, where
   * the primary action is the dark-teal pill (DESIGN.md: Buttons). */
  surface?: 'dark' | 'paper'
  icon?: ReactNode
}

export function Button({ variant = 'primary', surface = 'dark', icon, className = '', children, ...rest }: ButtonProps) {
  const variantClass =
    surface === 'paper'
      ? variant === 'primary' ? styles.paperPrimary : styles.paperSecondary
      : variant === 'primary' ? styles.primary : styles.secondary
  return (
    <button className={joinClassNames(styles.base, variantClass, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
}
