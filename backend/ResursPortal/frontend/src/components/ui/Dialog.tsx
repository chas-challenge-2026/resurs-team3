import * as React from "react"
import { createPortal } from "react-dom"

import { joinClassNames } from "@/lib/joinClassNames"
import { useControllableState } from "@/hooks/use-controllable-state"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { useOpenTransition } from "@/hooks/use-open-transition"
import { Icon } from "@/components/Icon"
import styles from "./Dialog.module.css"

const TRANSITION_MS = 200

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog subcomponents must be used within <Dialog>.")
  }
  return context
}

interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)
  const titleId = React.useId()
  const descriptionId = React.useId()

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen, titleId, descriptionId }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({ onClick, ...props }: React.ComponentProps<"button">) {
  const { setOpen } = useDialogContext()
  return (
    <button type="button" data-slot="dialog-trigger" onClick={(event) => { onClick?.(event); setOpen(true) }} {...props} />
  )
}

function DialogClose({ onClick, ...props }: React.ComponentProps<"button">) {
  const { setOpen } = useDialogContext()
  return (
    <button type="button" data-slot="dialog-close" onClick={(event) => { onClick?.(event); setOpen(false) }} {...props} />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const { open, setOpen, titleId, descriptionId } = useDialogContext()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { mounted, visible } = useOpenTransition(open, TRANSITION_MS)

  useEscapeKey(open, () => setOpen(false))
  useFocusTrap(contentRef, open)
  useScrollLock(mounted)

  if (!mounted) return null

  return createPortal(
    <div
      data-slot="dialog-overlay"
      className={joinClassNames(styles.overlay, visible && styles.overlayVisible)}
      onMouseDown={() => setOpen(false)}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-slot="dialog-content"
        onMouseDown={(event) => event.stopPropagation()}
        className={joinClassNames(styles.content, visible && styles.contentVisible, className)}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogClose className={styles.closeButton}>
            <Icon name="x" className={styles.closeIcon} />
            <span className={styles.srOnly}>Stäng</span>
          </DialogClose>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={joinClassNames(styles.header, className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={joinClassNames(styles.footer, className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useDialogContext()
  return <h2 id={titleId} data-slot="dialog-title" className={joinClassNames(styles.title, className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descriptionId } = useDialogContext()
  return <p id={descriptionId} data-slot="dialog-description" className={joinClassNames(styles.description, className)} {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger }
