import '../toned.config.ts'
import '../../ui/src/styles.css'
import './docs-theme.css'

import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen.ts'

// The dev server inlines the SSR render's stylesheets to avoid a flash of
// unstyled content. By now the imports above have injected Vite's own copies,
// so drop the inlined ones; otherwise they would shadow hot updates.
if (import.meta.env.DEV)
  for (const node of document.querySelectorAll('style[data-ssr-dev-style]'))
    node.remove()

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

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing documentation application root')

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
