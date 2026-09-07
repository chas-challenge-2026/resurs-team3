import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/hooks/use-controllable-state"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { useOpenTransition } from "@/hooks/use-open-transition"
import { Icon } from "@/components/Icon"

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
      className={cn(
        "fixed inset-0 z-50 bg-black/60 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
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
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-white/10 bg-card p-6 text-white shadow-lg outline-none transition-all duration-200 sm:max-w-lg",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogClose className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon name="x" className="size-4" />
            <span className="sr-only">Stäng</span>
          </DialogClose>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useDialogContext()
  return <h2 id={titleId} data-slot="dialog-title" className={cn("text-lg leading-none font-semibold", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descriptionId } = useDialogContext()
  return <p id={descriptionId} data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger }
