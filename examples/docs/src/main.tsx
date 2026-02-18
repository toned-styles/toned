import '../toned.config.ts'
import '../../ui/src/styles.css'

import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen.ts'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultNotFoundComponent: () => <p>Not Found</p>,
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

if (rootEl.firstElementChild) {
  // Tell TanStack Router this is an SSR-hydrated page so Matches uses
  // SafeFragment instead of Suspense, matching the server-rendered tree.
  ;(router as any).ssr = true
  // Wait for router to load the current route before hydrating,
  // matching what the server does in entry-server.tsx.
  router.load().then(() => {
    hydrateRoot(rootEl, app)
  })
} else {
  createRoot(rootEl).render(app)
}
