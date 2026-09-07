import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { useFloatingPosition, type Side } from "@/hooks/use-floating-position"

interface TooltipProps {
  content: React.ReactNode
  side?: Side
  /** Skip showing the tooltip entirely — e.g. a sidebar item's label is already visible when the sidebar isn't collapsed, so the tooltip would be redundant. */
  disabled?: boolean
  children: React.ReactElement
}

/**
 * A minimal hover/focus tooltip: portals a small floating label to
 * `document.body` and positions it against the trigger's bounding rect
 * (flipping to the opposite side, and clamped on-screen, near a viewport
 * edge — see useFloatingPosition), so it isn't clipped by an ancestor's
 * `overflow: hidden` (e.g. the collapsed sidebar). No positioning library.
 *
 * Simplification: clones the child to attach hover/focus handlers and a
 * ref, without preserving a ref the child might already carry. Every call
 * site today passes a plain element with no existing ref, so this doesn't
 * bite — worth revisiting if that changes.
 */
export function Tooltip({ content, side = "top", disabled = false, children }: TooltipProps) {
  const [open, setOpen] = React.useState(false)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  function show() {
    if (disabled) return
    setRect(triggerRef.current?.getBoundingClientRect() ?? null)
    setOpen(true)
  }
  function hide() {
    setOpen(false)
  }

  const trigger = React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node
    },
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> })

  return (
    <>
      {trigger}
      {open && !disabled && rect
        ? createPortal(<TooltipBubble rect={rect} side={side}>{content}</TooltipBubble>, document.body)
        : null}
    </>
  )
}

function TooltipBubble({ rect, side, children }: { rect: DOMRect; side: Side; children: React.ReactNode }) {
  const floatingRef = React.useRef<HTMLDivElement>(null)
  const { style, ready } = useFloatingPosition(floatingRef, rect, side, 8)

  return (
    <div
      ref={floatingRef}
      role="tooltip"
      data-slot="tooltip-content"
      style={{ ...style, opacity: ready ? 1 : 0 }}
      className={cn(
        "pointer-events-none z-50 w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-background text-balance shadow-md"
      )}
    >
      {children}
    </div>
  )
}
