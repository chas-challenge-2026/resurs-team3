import { joinClassNames } from "@/lib/joinClassNames"
import styles from "./Skeleton.module.css"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={joinClassNames(styles.skeleton, className)}
      {...props}
    />
  )
}

export { Skeleton }
