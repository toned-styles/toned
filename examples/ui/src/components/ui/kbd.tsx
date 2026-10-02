import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'

export const kbdStyles = stylesheet({
  root: {
    bgColor: 'muted',
    textColor: 'muted',
    borderColor: 'default',
    borderWidth: 'thin',
    display: 'inline-flex',
    width: 'fit-content',
    height: '1.375rem',
    minWidth: '1.375rem',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: 'small',
    paddingX: 1.5,
    typo: 'caption',
    fontWeight: 500,
    pointerEvents: 'none',
    // No token: key names are not selectable text.
    '@platform web': { $style: { userSelect: 'none' } },
  },
  group: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
  },
})

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  const s = useStyles(kbdStyles)

  return <kbd data-slot="kbd" {...s.root.with({ className })} {...props} />
}

function KbdGroup({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(kbdStyles)

  return (
    <kbd data-slot="kbd-group" {...s.group.with({ className })} {...props} />
  )
}

export { Kbd, KbdGroup }
