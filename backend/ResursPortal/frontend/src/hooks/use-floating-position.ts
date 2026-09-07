import * as React from "react"

export type Side = "top" | "right" | "bottom" | "left"

interface Viewport {
  width: number
  height: number
}

interface FloatingPositionResult {
  style: React.CSSProperties
  side: Side
  /** False until the floating element's own size has been measured and a real position computed — render it invisible until then so it never flashes at the wrong spot. */
  ready: boolean
}

/**
 * Positions a floating element (a tooltip bubble, a select popover) against
 * a trigger's bounding rect, flipping to the opposite side when the
 * preferred side would run off the viewport, and clamping so it never
 * renders fully off-screen even when nothing fits.
 *
 * This needs the floating element's own rendered size, which only exists
 * once it's actually in the DOM — so it's a two-pass affair: mount it
 * (the caller renders it, invisible, as soon as `triggerRect` is known),
 * measure it here via `floatingRef` in a layout effect, then report back
 * the real position. `ready` tells the caller when to reveal it. Because
 * this runs in useLayoutEffect (before the browser paints), the invisible
 * first pass is never actually seen.
 */
export function useFloatingPosition(
  floatingRef: React.RefObject<HTMLElement | null>,
  triggerRect: DOMRect | null,
  preferredSide: Side,
  gap: number,
  align: "center" | "start" = "center"
): FloatingPositionResult {
  const [result, setResult] = React.useState<{ style: React.CSSProperties; side: Side } | null>(null)

  React.useLayoutEffect(() => {
    // Deliberately doesn't reset `result` back to null when triggerRect
    // goes away — both call sites already stop rendering (or unmount) the
    // floating element the instant its trigger rect is gone, so a stale
    // `result` is never actually read. Resetting it here would mean calling
    // setState unconditionally at the top of an effect, which is the
    // pattern this project's react-hooks purity lint flags (and rightly —
    // it's state that can be derived instead of synchronized).
    if (!triggerRect) return
    const node = floatingRef.current
    if (!node) return

    const floatingRect = node.getBoundingClientRect()
    const viewport: Viewport = { width: window.innerWidth, height: window.innerHeight }

    const side = pickSide(preferredSide, triggerRect, floatingRect, viewport, gap)
    setResult({ style: placementStyle(side, triggerRect, floatingRect, viewport, gap, align), side })
  }, [floatingRef, triggerRect, preferredSide, gap, align])

  return {
    style: result?.style ?? { position: "fixed", top: 0, left: 0, visibility: "hidden" },
    side: result?.side ?? preferredSide,
    ready: result !== null,
  }
}

function pickSide(
  preferred: Side,
  trigger: DOMRect,
  floating: DOMRect,
  viewport: Viewport,
  gap: number
): Side {
  const fits: Record<Side, boolean> = {
    right: trigger.right + gap + floating.width <= viewport.width,
    left: trigger.left - gap - floating.width >= 0,
    bottom: trigger.bottom + gap + floating.height <= viewport.height,
    top: trigger.top - gap - floating.height >= 0,
  }
  if (fits[preferred]) return preferred

  const opposite: Record<Side, Side> = { right: "left", left: "right", top: "bottom", bottom: "top" }
  if (fits[opposite[preferred]]) return opposite[preferred]

  // Nothing fits cleanly either way (a very small viewport) — keep the
  // preferred side and let the clamp below pull it back on-screen instead
  // of guessing between two equally-bad options.
  return preferred
}

function placementStyle(
  side: Side,
  trigger: DOMRect,
  floating: DOMRect,
  viewport: Viewport,
  gap: number,
  align: "center" | "start"
): React.CSSProperties {
  let top: number
  let left: number

  if (side === "right" || side === "left") {
    top = trigger.top + trigger.height / 2 - floating.height / 2
    left = side === "right" ? trigger.right + gap : trigger.left - gap - floating.width
  } else {
    left = align === "start" ? trigger.left : trigger.left + trigger.width / 2 - floating.width / 2
    top = side === "bottom" ? trigger.bottom + gap : trigger.top - gap - floating.height
  }

  // Clamp so it's always fully on-screen, even after flipping — e.g. a wide
  // popover triggered near a corner.
  top = Math.min(Math.max(top, gap), viewport.height - floating.height - gap)
  left = Math.min(Math.max(left, gap), viewport.width - floating.width - gap)

  return { position: "fixed", top, left }
}
