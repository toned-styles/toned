import { cardStyles } from '@examples/shared'
import { useStyles } from '@toned/react'

import { Button } from './Button.tsx'

export default function Card() {
  const s = useStyles(cardStyles)

  return (
    <div {...s.Root}>
      <Button label="Hover me" />

      <span {...s.Hint}>
        Edit <code {...s.Code}>src/App.tsx</code> and save to test HMR
      </span>
    </div>
  )
}
