import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const skeletonStyles = stylesheet({
  root: {
    bgColor: 'skeleton',
    borderRadius: 'medium',
    style: {
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
  },
})

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(skeletonStyles)

  return (
    <div
      data-slot="skeleton"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

export { Skeleton }
