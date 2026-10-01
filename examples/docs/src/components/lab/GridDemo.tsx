import { createElements, useStyles } from '@toned/react'
import { useState } from 'react'
import { libraryStyles } from '../../styles/library.ts'
import { ShowcaseProvider } from '../ShowcaseProvider.tsx'
import { gridStyles } from './grid.styles.ts'

const Grid = createElements(gridStyles)

export function GridDemo() {
  const s = useStyles(libraryStyles)
  const [stacked, setStacked] = useState(false)
  return (
    <div {...s.stack}>
      <label>
        <input
          type="checkbox"
          checked={stacked}
          onChange={(event) => setStacked(event.target.checked)}
        />{' '}
        Stack named areas
      </label>
      <ShowcaseProvider>
        <Grid stacked={stacked}>
          <Grid.Root>
            <Grid.Avatar>T</Grid.Avatar>
            <Grid.Title>Named parts. Named places.</Grid.Title>
            <Grid.Body>
              The same avatar, title and body move between two typed grid
              layouts. No markup rewrite.
            </Grid.Body>
          </Grid.Root>
        </Grid>
      </ShowcaseProvider>
      <p {...s.muted}>
        This is the actual defineGrid API with shared area ownership. Grid is
        web-only; adaptive stack, row and wrap layouts provide the portable
        alternative.
      </p>
    </div>
  )
}
