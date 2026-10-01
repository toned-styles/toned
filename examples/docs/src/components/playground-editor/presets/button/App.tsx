import { createElements } from '@toned/react'
import { useState } from 'react'
import { type ButtonVariants, buttonStyles } from './styles.ts'

// Bind the sheet once, at module scope. `Button` carries the variants;
// `Button.Root` and `Button.Badge` are stable components, one per part.
const Button = createElements(buttonStyles)

// The variant controls above the preview pass their values in as props.
export default function App(variants: Partial<ButtonVariants>) {
  const [saved, setSaved] = useState(0)

  return (
    <Button {...variants}>
      <Button.Root
        as="button"
        type="button"
        disabled={variants.disabled}
        onClick={() => setSaved((count) => count + 1)}
      >
        Save changes
        <Button.Badge as="span">{saved}</Button.Badge>
      </Button.Root>
    </Button>
  )
}
