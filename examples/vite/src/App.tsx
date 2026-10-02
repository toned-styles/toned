import './index.css'
import { TonedProvider, useStyles } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import { lazy, Suspense } from 'react'

import { renderer } from './renderer.ts'
import { pageStyles } from './styles.ts'

// Lazy components stream during SSR; their sheets are part of the CSS build.
const Card = lazy(() => import('./Card.tsx'))

function Page() {
  const s = useStyles(pageStyles)

  return (
    <main {...s.Root}>
      <h1 {...s.Title}>Vite + React</h1>

      <Suspense fallback={<p>Loading card component...</p>}>
        <Card />
      </Suspense>
    </main>
  )
}

export default function App() {
  return (
    <TonedProvider renderer={renderer} host={webHost}>
      <Page />
    </TonedProvider>
  )
}
