import '../toned.config.ts'
import '../../ui/src/styles.css'
import './docs-theme.css'

import { PassThrough } from 'node:stream'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { StrictMode } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { routeTree } from './routeTree.gen.ts'

export async function render(url: string) {
  const memoryHistory = createMemoryHistory({ initialEntries: [url] })
  const router = createRouter({ routeTree, history: memoryHistory })

  await router.load()

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    const passthrough = new PassThrough()
    passthrough.on('data', (chunk) => chunks.push(chunk))
    passthrough.on('end', () => resolve(Buffer.concat(chunks).toString()))
    passthrough.on('error', reject)

    let piped = false
    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
      {
        onAllReady() {
          // Lazy route retries can notify readiness again; a stream has one destination.
          if (piped) return
          piped = true
          pipe(passthrough)
        },
        onError: reject,
      },
    )
  })
}
