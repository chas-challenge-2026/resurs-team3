import type { CSSProperties } from 'react'

interface SymbolProps {
  /** Rendered height in px; width scales automatically to the icon's aspect ratio. Ignored if width/height are set. */
  size?: number
  /** Explicit box width (px number, or a CSS value like '100%'). Use with height for an exact placement. */
  width?: number | string
  /** Explicit box height (px number, or a CSS value like '100%'). Use with width. */
  height?: number | string
  className?: string
  style?: CSSProperties
}

/** The standalone Resurs "sun" icon mark, without the wordmark. */
export function Symbol({ size = 48, width, height, className = '', style }: SymbolProps) {
  const dims =
    width !== undefined || height !== undefined
      ? { width: width ?? 'auto', height: height ?? 'auto', objectFit: 'contain' as const }
      : { height: size, width: 'auto' as const }

  return (
    <img
      src="/logos/resurs-symbol.png"
      alt=""
      aria-hidden="true"
      style={{ ...dims, ...style }}
      className={className}
    />
  )
}
