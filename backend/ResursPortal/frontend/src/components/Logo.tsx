interface LogoProps {
  /** Rendered height in px; width scales automatically to the logo's aspect ratio. Ignored if width/height are set. */
  size?: number
  /** Explicit box width (px number, or a CSS value like '100%'). Use with height for a fixed/fluid placement. */
  width?: number | string
  /** Explicit box height (px number, or a CSS value like '100%'). Use with width. */
  height?: number | string
  className?: string
}

export function Logo({ size = 40, width, height, className = '' }: LogoProps) {
  const style =
    width !== undefined || height !== undefined
      ? { width: width ?? 'auto', height: height ?? 'auto', objectFit: 'contain' as const }
      : { height: size, width: 'auto' as const }

  return (
    <img
      src="/logos/ResursDirekt1_vertical.svg"
      alt="Resurs Direkt"
      style={style}
      className={className}
    />
  )
}
