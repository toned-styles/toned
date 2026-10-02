import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'

export const skeletonStyles = stylesheet({
  root: {
    bgColor: 'skeleton',
    borderRadius: 'medium',
    // No token: the pulse keyframes live in styles.css.
    '@platform web': {
      $style: {
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
})

function Skeleton({ className, style, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(skeletonStyles)

  return (
    <div
      data-slot="skeleton"
      {...s.root.with({ className, style })}
      {...props}
    />
  )
}

export { Skeleton }
