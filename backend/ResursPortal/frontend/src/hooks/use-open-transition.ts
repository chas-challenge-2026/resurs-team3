import * as React from "react"

interface OpenTransitionResult {
  /** Whether the element should be in the DOM at all. Stays `true` for
   * `durationMs` after `open` goes false so an exit transition has time to
   * play before the element is actually removed. */
  mounted: boolean
  /** Whether the "entered" styles should be applied. `false` for one frame
   * right after mount (so the browser paints the closed state first and the
   * transition to open has something to animate from) and immediately on
   * close (so the exit transition starts right away). */
  visible: boolean
}

/**
 * Drives a mount/visible pair for CSS enter/exit transitions — the bit
 * Radix's presence animation used to handle for Dialog/Sheet/Select.
 *
 * The "start mounting" and "start hiding" state changes are done as a
 * render-time adjustment (React's documented alternative to an effect that
 * would just mirror a prop — see "Adjusting state when a prop changes" in
 * the React docs) rather than a synchronous setState at the top of an
 * effect body, which is exactly what this project's
 * react-hooks/set-state-in-effect lint flags. The effect below is only used
 * for the two things that genuinely need to happen asynchronously: a
 * one-frame delay after mount (rAF) and the delayed unmount (setTimeout).
 */
export function useOpenTransition(open: boolean, durationMs: number): OpenTransitionResult {
  const [mounted, setMounted] = React.useState(open)
  const [visible, setVisible] = React.useState(open)
  const [prevOpen, setPrevOpen] = React.useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMounted(true)
    } else {
      setVisible(false)
    }
  }

  React.useEffect(() => {
    if (!open) {
      if (!mounted) return
      const timeout = setTimeout(() => setMounted(false), durationMs)
      return () => clearTimeout(timeout)
    }

    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [open, mounted, durationMs])

  return { mounted, visible }
}
