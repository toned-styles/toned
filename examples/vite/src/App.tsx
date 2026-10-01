import './index.css'
import '../toned.config.ts'
import { t } from '@toned/systems/base'
import { lazy, Suspense } from 'react'

// Works also with SSR as expected
const Card = lazy(() => import('./Card.tsx'))

function App() {
  return (
    <main>
      <h1 {...t({ typo: 'heading_1' })}>Vite + React</h1>

      <Suspense fallback={<p>Loading card component...</p>}>
        <Card />
      </Suspense>
    </main>
  )
}

export default App
