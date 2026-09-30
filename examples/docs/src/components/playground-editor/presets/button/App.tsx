import { useStyles } from '@toned/react'
import { useState } from 'react'
import { type ButtonVariants, buttonStyles } from './styles.ts'

// The variant controls above the preview pass their values in as props.
export default function App(variants: Partial<ButtonVariants>) {
  const [saved, setSaved] = useState(0)
  const s = useStyles(buttonStyles, variants)

  return (
    <button
      {...s.Root}
      type="button"
      disabled={variants.disabled}
      onClick={() => setSaved((count) => count + 1)}
    >
      Save changes
      <span {...s.Badge}>{saved}</span>
    </button>
  )
}
