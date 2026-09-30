import { useStyles } from '@toned/react'
import { type CardVariants, cardStyles } from './styles.ts'

export default function App(variants: Partial<CardVariants>) {
  const s = useStyles(cardStyles, variants)

  return (
    <article {...s.Root}>
      <header {...s.Header}>
        <h3 {...s.Title}>Deploy preview</h3>
        <span {...s.Status}>Ready</span>
      </header>
      <p {...s.Body}>
        Every part of this card comes from one stylesheet. Switch the density
        and the header, body and footer all adjust together.
      </p>
      <footer {...s.Footer}>
        <button {...s.Action} type="button">
          Open preview
        </button>
      </footer>
    </article>
  )
}
