import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/hooks/use-controllable-state"
import { useClickOutside } from "@/hooks/use-click-outside"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { useFloatingPosition } from "@/hooks/use-floating-position"
import { useOpenTransition } from "@/hooks/use-open-transition"
import { Icon } from "@/components/Icon"

const TRANSITION_MS = 150

interface SelectContextValue {
  value: string | undefined
  setValue: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  labels: Record<string, React.ReactNode>
  registerLabel: (itemValue: string, label: React.ReactNode) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select subcomponents must be used within <Select>.")
  }
  return context
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

/**
 * A dropdown/listbox — trigger button + a positioned popover of options,
 * hand-rolled instead of pulled from Radix. `labels` is a small registry
 * that each SelectItem fills in on mount so SelectValue can show the
 * selected item's label without the trigger and the option list needing to
 * share JSX directly (mirrors, in a much smaller way, what Radix does by
 * portaling the matched item into the trigger).
 *
 * Keyboard: opening moves focus to the selected option (or the first one),
 * ArrowUp/ArrowDown/Home/End move real DOM focus between the option
 * buttons (see SelectContent), and Enter/Space activate whichever option
 * has focus — that last part is free, since options are plain <button>s.
 */
function Select({ value, defaultValue = "", onValueChange, children }: SelectProps) {
  const [current, setValue] = useControllableState(value, defaultValue, onValueChange)
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [labels, setLabels] = React.useState<Record<string, React.ReactNode>>({})

  const registerLabel = React.useCallback((itemValue: string, label: React.ReactNode) => {
    setLabels((prev) => (prev[itemValue] === label ? prev : { ...prev, [itemValue]: label }))
  }, [])

  return (
    <SelectContext.Provider value={{ value: current, setValue, open, setOpen, triggerRef, labels, registerLabel }}>
      {children}
    </SelectContext.Provider>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<"button"> & { size?: "sm" | "default" }) {
  const { open, setOpen, triggerRef } = useSelectContext()
  return (
    <button
      type="button"
      ref={triggerRef}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      data-slot="select-trigger"
      data-size={size}
      onClick={() => setOpen(!open)}
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8",
        className
      )}
      {...props}
    >
      {children}
      <Icon name="chevron-down" className="size-4 shrink-0 opacity-50" />
    </button>
  )
}

function SelectValue({ placeholder, className }: { placeholder?: string; className?: string }) {
  const { value, labels } = useSelectContext()
  const label = value ? labels[value] : undefined
  return (
    <span className={cn("line-clamp-1 flex items-center gap-2", !label && "text-muted-foreground", className)}>
      {label ?? placeholder}
    </span>
  )
}

const OPTION_SELECTOR = '[role="option"]'

function SelectContent({ className, children, ...props }: React.ComponentProps<"div">) {
  const { open, setOpen, triggerRef } = useSelectContext()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const { style, ready } = useFloatingPosition(contentRef, rect, "bottom", 4, "start")
  const { mounted, visible } = useOpenTransition(open, TRANSITION_MS)

  React.useEffect(() => {
    if (open) setRect(triggerRef.current?.getBoundingClientRect() ?? null)
  }, [open, triggerRef])

  // Once the popover has actually rendered (rect is set, so it's in the
  // DOM), move focus to the selected option — or the first one if nothing's
  // selected yet — the way a native <select> or a real listbox does.
  React.useEffect(() => {
    if (!open || !rect) return
    const items = Array.from(contentRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? [])
    const selected = items.find((item) => item.getAttribute("aria-selected") === "true")
    ;(selected ?? items[0])?.focus()
  }, [open, rect])

  useClickOutside([triggerRef, contentRef], open, () => setOpen(false))
  useEscapeKey(open, () => setOpen(false))

  function onKeyDown(event: React.KeyboardEvent) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    const items = Array.from(contentRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? [])
    if (items.length === 0) return
    event.preventDefault()

    const currentIndex = items.indexOf(document.activeElement as HTMLElement)
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? currentIndex < items.length - 1
              ? currentIndex + 1
              : 0
            : currentIndex > 0
              ? currentIndex - 1
              : items.length - 1

    items[nextIndex]?.focus()
  }

  if (!mounted) return null

  return createPortal(
    <div
      ref={contentRef}
      role="listbox"
      data-slot="select-content"
      onKeyDown={onKeyDown}
      style={{ ...style, minWidth: rect?.width, opacity: ready && visible ? 1 : 0 }}
      className={cn(
        "z-50 max-h-72 overflow-y-auto rounded-md border border-white/10 bg-popover p-1 text-popover-foreground shadow-md transition-[opacity,scale] duration-150",
        visible ? "scale-100" : "scale-95",
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="select-label" className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)} {...props} />
}

function SelectItem({
  value: itemValue,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const { value, setValue, setOpen, registerLabel } = useSelectContext()
  const isSelected = value === itemValue

  React.useEffect(() => {
    registerLabel(itemValue, children)
  }, [itemValue, children, registerLabel])

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      data-slot="select-item"
      onClick={() => {
        setValue(itemValue)
        setOpen(false)
      }}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-left text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        {isSelected ? <Icon name="check" className="size-4" /> : null}
      </span>
      {children}
    </button>
  )
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="select-separator" className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)} {...props} />
}

export { Select, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue }
