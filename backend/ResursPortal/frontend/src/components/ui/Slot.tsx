import * as React from "react"

/**
 * Renders its single child element instead of a wrapper, merging this
 * component's className/props onto it — the `asChild` pattern
 * (`<SidebarMenuButton asChild><Link .../></SidebarMenuButton>` to get the
 * button's styling on a real anchor/Link instead of a nested button-in-a-
 * button). A small hand-rolled stand-in for Radix's `Slot`.
 *
 * Simplification: if the child already defines a prop this component also
 * sets (e.g. both pass `onClick`), the child's own value wins rather than
 * composing both — fine for how this app uses `asChild` today (styling a
 * navigation element), but worth knowing if a future use case needs both
 * handlers to fire.
 */
export function Slot({
  children,
  className,
  ...slotProps
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  if (!React.isValidElement(children)) {
    return null
  }

  const child = children as React.ReactElement<Record<string, unknown>>
  const childProps = (child.props ?? {}) as { className?: string }

  const mergedClassName = [className, childProps.className].filter(Boolean).join(" ")

  return React.cloneElement(child, {
    ...slotProps,
    ...childProps,
    className: mergedClassName || undefined,
  })
}
