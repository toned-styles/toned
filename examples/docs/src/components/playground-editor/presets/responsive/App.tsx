import { useStyles } from '@toned/react'
import { planStyles } from './styles.ts'

// No variants here, and one part is repeated on plain hosts, so this example
// spreads `useStyles` prop bags. Reach for `createElements` when parts share
// variants or state.
// Resize the split, or pick a preview width, to cross the 480px threshold.
export default function App() {
  const s = useStyles(planStyles)

  return (
    <div {...s.Root}>
      <div {...s.Plans}>
        <button {...s.Plan} type="button">
          <span {...s.Name}>Starter</span>
          <span {...s.Price}>£0</span>
        </button>
        <button {...s.Featured} type="button">
          <span {...s.Name}>Team</span>
          <span {...s.Price}>£12</span>
        </button>
        <button {...s.Plan} type="button">
          <span {...s.Name}>Scale</span>
          <span {...s.Price}>£40</span>
        </button>
      </div>
    </div>
  )
}
