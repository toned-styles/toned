import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Loader2Icon } from 'lucide-react'

export const spinnerStyles = stylesheet({
  root: {
    width: '1rem',
    height: '1rem',
    flexShrink: '0',
    // No token: the spin keyframes live in styles.css.
    '@platform web': {
      $style: {
        animation: 'spin 1s linear infinite',
      },
    },
  },
})

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const s = useStyles(spinnerStyles)

  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

export { Spinner }
