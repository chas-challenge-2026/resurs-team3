import * as React from "react"

/** Calls `onOutside` on a pointerdown outside every ref in `refs`, while `active`. */
export function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  active: boolean,
  onOutside: () => void
) {
  React.useEffect(() => {
    if (!active) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      const isInside = refs.some((ref) => ref.current?.contains(target))
      if (!isInside) onOutside()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs is usually a fresh array literal per render; only its contents matter.
  }, [active, onOutside])
}
