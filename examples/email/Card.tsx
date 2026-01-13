import { styles } from '@examples/shared/card'
import { useStyles } from '@toned/react'
import { t } from '@toned/systems/base'

import { Button } from './Button.tsx'

function Card() {
  const s = useStyles(styles)

  return (
    <div {...s.container}>
      <Button label={String(Math.random())} />

      <span {...t({ textColor: 'status_info' })}>
        Edit <span {...s['code']}>src/App.tsx</span> and save to test HMR
      </span>
    </div>
  )
}

export default Card
