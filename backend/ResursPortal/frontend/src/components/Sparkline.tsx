interface SparklineProps {
  /** Series values, oldest first. Needs at least 2 points to draw a line. */
  values: number[]
  className?: string
}

/**
 * A quiet, single-hue trend line for a stat tile — per the stat-tile
 * contract, the mono/de-emphasis sparkline that sits under a headline
 * number. Color comes entirely from `currentColor` on the wrapping
 * className (e.g. `text-resurs-tealLight`), so the line and its area wash
 * always share one hue — no second color, no legend needed for a single
 * series.
 */
export function Sparkline({ values, className = '' }: SparklineProps) {
  if (values.length < 2) return null

  const width = 100
  const height = 28
  const padding = 3 // keeps the 2px stroke from clipping at the top/bottom edge

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)

  const points = values.map((value, i) => {
    const x = i * step
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return [x, y] as const
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={areaPath} fill="currentColor" opacity={0.12} stroke="none" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
