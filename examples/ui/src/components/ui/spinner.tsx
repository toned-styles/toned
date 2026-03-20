import { Loader2Icon } from "lucide-react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const spinnerStyles = stylesheet({
  root: {
    width: '1rem',
    height: '1rem',
    style: {
      animation: 'spin 1s linear infinite',
    },
  },
})

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const s = useStyles(spinnerStyles)

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

export { Spinner }
