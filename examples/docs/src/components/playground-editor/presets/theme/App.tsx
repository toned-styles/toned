import { useStyles } from '@toned/react'
import { type ProfileVariants, profileStyles } from './styles.ts'

export default function App(variants: Partial<ProfileVariants>) {
  const s = useStyles(profileStyles, variants)

  return (
    <section {...s.Root}>
      <div {...s.Card}>
        <span {...s.Eyebrow}>DESIGN ENGINEER</span>
        <h3 {...s.Name}>Ada Lovelace</h3>
        <p {...s.Bio}>
          One theme token sets four custom properties. Every other token reads
          them, so switching the theme recolours the whole card.
        </p>
        <button {...s.Follow} type="button">
          Follow
        </button>
      </div>
    </section>
  )
}
