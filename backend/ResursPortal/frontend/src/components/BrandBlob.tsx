import type { CSSProperties } from 'react'

interface BrandBlobProps {
  /**
   * Fill color — a subtle, tonal shade barely distinguishable from the
   * surrounding background (per the official brand guide's dark section
   * slides: a rounded shape only a touch lighter than the charcoal behind
   * it, never a colorful illustration). Defaults to a faint white overlay,
   * which reads correctly against any of the app's dark teal backgrounds
   * without needing a per-screen hex value.
   */
  color?: string
  /** Rendered width, in px or any CSS length. The shape always spans the full height of its positioned ancestor. */
  width: number | string
  opacity?: number
  className?: string
  style?: CSSProperties
}

/**
 * The Resurs brand's decorative background shape: a rectangle flush against
 * the left edge whose right side blooms into a full semicircle cap — the
 * motif used behind headlines on the official co-marketing guide's dark
 * divider slides. Replaces the earlier multicolor "sun" icon, which does
 * not appear anywhere in Resurs Bank's actual brand guidelines.
 *
 * `rounded-r-full` is what does the work: Tailwind's border-radius cap
 * (9999px) is clamped by the browser to exactly half the element's
 * rendered height, so the right edge is always a true semicircle
 * regardless of the container's actual height — no measuring needed.
 */
export function BrandBlob({ color = 'rgba(255,255,255,0.06)', width, opacity = 1, className = '', style }: BrandBlobProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 left-0 rounded-r-full ${className}`}
      style={{ width, backgroundColor: color, opacity, ...style }}
    />
  )
}
