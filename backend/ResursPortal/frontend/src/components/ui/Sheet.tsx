import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/hooks/use-controllable-state"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { useOpenTransition } from "@/hooks/use-open-transition"
import { Icon } from "@/components/Icon"

type Side = "top" | "right" | "bottom" | "left"

const TRANSITION_MS = 300

interface SheetContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheetContext() {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error("Sheet subcomponents must be used within <Sheet>.")
  }
  return context
}

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

/** A slide-in-from-an-edge panel — same engine as Dialog (portal, focus trap, escape, scroll lock), just anchored to a side instead of centered. Used for the sidebar's mobile drawer. */
function Sheet({ open, onOpenChange, children }: SheetProps) {
  const [isOpen, setOpen] = useControllableState(open, false, onOpenChange)
  return <SheetContext.Provider value={{ open: isOpen, setOpen }}>{children}</SheetContext.Provider>
}

function SheetClose({ onClick, ...props }: React.ComponentProps<"button">) {
  const { setOpen } = useSheetContext()
  return (
    <button
      type="button"
      data-slot="sheet-close"
      onClick={(event) => {
        onClick?.(event)
        setOpen(false)
      }}
      {...props}
    />
  )
}

const SIDE_STYLES: Record<Side, string> = {
  right: "inset-y-0 right-0 h-full w-3/4 border-l border-white/10 sm:max-w-sm",
  left: "inset-y-0 left-0 h-full w-3/4 border-r border-white/10 sm:max-w-sm",
  top: "inset-x-0 top-0 h-auto border-b border-white/10",
  bottom: "inset-x-0 bottom-0 h-auto border-t border-white/10",
}

// The off-screen starting/ending transform for each side — slides in from
// (and back out to) the edge the panel is anchored to.
const SIDE_HIDDEN_TRANSFORM: Record<Side, string> = {
  right: "translate-x-full",
  left: "-translate-x-full",
  top: "-translate-y-full",
  bottom: "translate-y-full",
}

function SheetContent({
  side = "right",
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & { side?: Side; showCloseButton?: boolean }) {
  const { open, setOpen } = useSheetContext()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { mounted, visible } = useOpenTransition(open, TRANSITION_MS)

  useEscapeKey(open, () => setOpen(false))
  useFocusTrap(contentRef, open)
  useScrollLock(mounted)

  if (!mounted) return null

  return createPortal(
    <div
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-50 bg-black/60 transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}
      onMouseDown={() => setOpen(false)}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        data-slot="sheet-content"
        onMouseDown={(event) => event.stopPropagation()}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-card text-white shadow-lg transition-transform duration-300 ease-in-out",
          SIDE_STYLES[side],
          visible ? "translate-x-0 translate-y-0" : SIDE_HIDDEN_TRANSFORM[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetClose className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon name="x" className="size-4" />
            <span className="sr-only">Stäng</span>
          </SheetClose>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="sheet-title" className={cn("font-semibold text-foreground", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

export { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }
