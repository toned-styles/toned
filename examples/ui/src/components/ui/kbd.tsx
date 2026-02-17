import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const kbdStyles = stylesheet({
  root: {
    bgColor: 'muted',
    textColor: 'muted',
    display: 'inline-flex',
    height: '1.25rem',
    minWidth: '1.25rem',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: 'small',
    paddingX: 1,
    typo: 'caption',
    fontWeight: 500,
    pointerEvents: 'none',
    style: {
      width: 'fit-content',
      userSelect: 'none',
    },
  },
  group: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
  },
})

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  const s = useStyles(kbdStyles)

  return (
    <kbd
      data-slot="kbd"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(kbdStyles)

  return (
    <kbd
      data-slot="kbd-group"
      className={cn(s.group.className, className)}
      style={s.group.style}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
