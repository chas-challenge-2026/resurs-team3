import type { CSSProperties } from 'react'

interface LogoProps {
  /** Rendered height in px; width scales automatically to the logo's aspect ratio. Ignored if width/height are set. */
  size?: number
  /** Explicit box width (px number, or a CSS value like '100%'). Use with height for a fixed/fluid placement. */
  width?: number | string
  /** Explicit box height (px number, or a CSS value like '100%'). Use with width. */
  height?: number | string
  className?: string
}

// The logo file's own intrinsic ratio (its <svg viewBox="0 0 2481 1350">).
// The root <svg> there also carries width="100%" height="100%", which
// leaves an <img> pointed at it without a reliable intrinsic ratio to
// derive an "auto" dimension from — browsers can fall back to the CSS
// default replaced-element ratio (2:1) instead of the real ~1.838:1,
// visibly distorting the logo whenever only one of width/height is set.
// Hardcoding the ratio here sidesteps that entirely.
const LOGO_ASPECT_RATIO = 2481 / 1350

export function Logo({ size, width, height, className = '' }: LogoProps) {
  let style: CSSProperties

  if (typeof height === 'number' && width === undefined) {
    style = { height, width: height * LOGO_ASPECT_RATIO }
  } else if (typeof width === 'number' && height === undefined) {
    style = { width, height: width / LOGO_ASPECT_RATIO }
  } else if (width !== undefined || height !== undefined) {
    // Percentage/mixed values (e.g. width="70%" height="auto") — can't
    // precompute a pixel pair, so pin the ratio via CSS and let object-fit
    // fill the box without stretching.
    style = {
      width: width ?? 'auto',
      height: height ?? 'auto',
      aspectRatio: `${LOGO_ASPECT_RATIO}`,
      objectFit: 'contain',
    }
  } else {
    const s = size ?? 40
    style = { height: s, width: s * LOGO_ASPECT_RATIO }
  }

  return (
    <img
      src="/logos/ResursDirekt1_vertical.svg"
      alt="Resurs Direkt"
      style={style}
      className={className}
    />
  )
}
