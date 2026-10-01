import '../toned.config.ts'
import '../../ui/src/styles.css'
import './docs-theme.css'

import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { StrictMode } from 'react'
import { prerenderToNodeStream } from 'react-dom/static'
import { routeTree } from './routeTree.gen.ts'

export async function render(url: string) {
  const memoryHistory = createMemoryHistory({ initialEntries: [url] })
  // `scrollRestoration` matches the client router. On the server it adds the
  // router's inline script, which restores the scroll position of a reloaded
  // page before the application hydrates.
  const router = createRouter({
    routeTree,
    history: memoryHistory,
    scrollRestoration: true,
  })

  await router.load()

  // These pages are static, so the HTML must be complete. By default React
  // moves any suspense boundary larger than ~12 KB (here: the route's whole
  // article) into a hidden block that an inline script reveals a frame later.
  // Readers would see the page shell paint before its article, and readers
  // without scripts never would. A static prerender with no size threshold
  // keeps everything in place.
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
    { progressiveChunkSize: Number.MAX_SAFE_INTEGER },
  )
  const chunks: Buffer[] = []
  for await (const chunk of prelude) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString()
}
