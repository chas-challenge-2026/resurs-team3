import * as React from "react"

import { joinClassNames } from "@/lib/joinClassNames"
import styles from "./Separator.module.css"

interface SeparatorProps extends React.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical"
}

/** A thin rule between sections — decorative (aria-hidden via role="none" for a screen reader) unless it's semantically meaningful, matching how <hr> behaves without the default browser styling. */
export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-slot="separator"
      className={joinClassNames(
        styles.separator,
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        className
      )}
      {...props}
    />
  )
}
