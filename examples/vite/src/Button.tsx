import { buttonStyles } from '@examples/shared'
import { useStyles } from '@toned/react'

export function Button({ label }: { label: string }) {
  const s = useStyles(buttonStyles, { size: 'm', variant: 'accent' })

  return (
    <button type="button" {...s.Root}>
      <span {...s.Label}>{label}</span>
    </button>
  )
}
