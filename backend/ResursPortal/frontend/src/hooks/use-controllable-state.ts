import * as React from "react"

/**
 * A state value that can be either controlled (the parent passes `value` +
 * `onChange`) or uncontrolled (the component owns its own state, starting
 * at `defaultValue`) — the open/onOpenChange pattern used by every
 * dialog/menu-ish component here, written once instead of per component.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? value : uncontrolled

  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) {
        setUncontrolled(next)
      }
      onChange?.(next)
    },
    [isControlled, onChange]
  )

  return [current, setValue]
}
