/**
 * Conditionally joins scoped CSS Module class names.
 *
 * Usage: joinClassNames(styles.tab, isActive && styles.tabActive)
 */
export function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}
