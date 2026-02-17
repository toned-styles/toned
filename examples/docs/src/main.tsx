import '../toned.config.ts'

import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { hydrateRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)

const rootEl = document.getElementById('root')!

// Hydrate if SSG content exists, otherwise create fresh root (dev mode)
if (rootEl.firstElementChild) {
  hydrateRoot(rootEl, app)
} else {
  createRoot(rootEl).render(app)
}
