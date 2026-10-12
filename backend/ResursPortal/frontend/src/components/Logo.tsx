import type { CSSProperties } from 'react'

interface LogoProps {
  /** Rendered height in px (or a CSS length); width follows the logo's ratio. */
  height?: number | string
  /** Rendered width (px or CSS length) instead of a height. */
  width?: number | string
  /** Kept for older call sites: same as height. */
  size?: number
  /** 'white' has white "Resurs" text, for dark surfaces. */
  variant?: 'color' | 'white'
  className?: string
  /** Empty for a decorative copy next to the real name. */
  alt?: string
}

// The files are cropped to the artwork itself (viewBox 261 319 2031 604),
// so the size you set is the size you see. The original exports had about
// 25% empty space above and below, which made the logo look small and
// off-centre wherever it was placed.
const LOGO_WIDTH = 2031
const LOGO_HEIGHT = 604

/**
 * The Resurs Direkt logo. Give it a height (or width) here, or leave both
 * out and size it with CSS on className (`height: 28px; width: auto`).
 */
export function Logo({ height, width, size, variant = 'color', className = '', alt = 'Resurs Direkt' }: LogoProps) {
  const h = height ?? size
  const style: CSSProperties | undefined =
    h !== undefined ? { height: h, width: 'auto' } : width !== undefined ? { width, height: 'auto' } : undefined

  return (
    <img
      src={variant === 'white' ? '/logos/resurs-direkt-white.svg' : '/logos/resurs-direkt.svg'}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      alt={alt}
      style={style}
      className={className}
    />
  )
}
