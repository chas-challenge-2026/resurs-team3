import * as React from "react"
import { createPortal } from "react-dom"

import { joinClassNames } from "@/lib/joinClassNames"
import { useControllableState } from "@/hooks/use-controllable-state"
import { useClickOutside } from "@/hooks/use-click-outside"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { useFloatingPosition } from "@/hooks/use-floating-position"
import { useOpenTransition } from "@/hooks/use-open-transition"
import { Icon } from "@/components/Icon"
import styles from "./Select.module.css"

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
      className={joinClassNames(styles.trigger, className)}
      {...props}
    >
      {children}
      <Icon name="chevron-down" className={styles.chevronIcon} />
    </button>
  )
}

function SelectValue({ placeholder, className }: { placeholder?: string; className?: string }) {
  const { value, labels } = useSelectContext()
  const label = value ? labels[value] : undefined
  return (
    <span className={joinClassNames(styles.value, !label && styles.valueMuted, className)}>
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
      className={joinClassNames(styles.content, visible && styles.contentVisible, className)}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="select-label" className={joinClassNames(styles.label, className)} {...props} />
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
      className={joinClassNames(styles.item, className)}
      {...props}
    >
      <span className={styles.itemCheck}>
        {isSelected ? <Icon name="check" className={styles.itemCheckIcon} /> : null}
      </span>
      {children}
    </button>
  )
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="select-separator" className={joinClassNames(styles.separator, className)} {...props} />
}

export { Select, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue }
