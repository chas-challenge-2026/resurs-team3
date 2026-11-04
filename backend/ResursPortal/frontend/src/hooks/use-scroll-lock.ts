import * as React from "react"

/** Locks page scroll (body overflow:hidden) while `active` — used so an open modal/drawer doesn't let the page scroll behind it. */
export function useScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [active])
}
