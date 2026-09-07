import * as React from "react"

/** Calls `onEscape` when the Escape key is pressed while `active`. */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  React.useEffect(() => {
    if (!active) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [active, onEscape])
}
