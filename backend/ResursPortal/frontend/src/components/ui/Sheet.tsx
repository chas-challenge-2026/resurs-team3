import * as React from "react"
import { createPortal } from "react-dom"

import { joinClassNames } from "@/lib/joinClassNames"
import { useControllableState } from "@/hooks/use-controllable-state"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { useOpenTransition } from "@/hooks/use-open-transition"
import { Icon } from "@/components/Icon"
import styles from "./Sheet.module.css"

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

const SIDE_CLASS: Record<Side, string> = {
  right: styles.sideRight,
  left: styles.sideLeft,
  top: styles.sideTop,
  bottom: styles.sideBottom,
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
      className={joinClassNames(styles.overlay, visible && styles.overlayVisible)}
      onMouseDown={() => setOpen(false)}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        data-slot="sheet-content"
        onMouseDown={(event) => event.stopPropagation()}
        className={joinClassNames(styles.content, SIDE_CLASS[side], visible && styles.contentVisible, className)}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetClose className={styles.closeButton}>
            <Icon name="x" className={styles.closeIcon} />
            <span className={styles.srOnly}>Stäng</span>
          </SheetClose>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={joinClassNames(styles.header, className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="sheet-title" className={joinClassNames(styles.title, className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="sheet-description" className={joinClassNames(styles.description, className)} {...props} />
  )
}

export { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }
