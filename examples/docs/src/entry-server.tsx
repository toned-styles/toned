import '../toned.config.ts'

import themeCss from '@toned/themes/shadcn/config.css?raw'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { generate } from '@toned/core/dom'
import { system } from '@toned/systems/base'
import { routeTree } from './routeTree.gen'

export async function render(url: string) {
  const memoryHistory = createMemoryHistory({ initialEntries: [url] })
  const router = createRouter({ routeTree, history: memoryHistory })

  await router.load()

  const html = renderToString(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )

  return html
}

export function generateCss() {
  return themeCss + generate(system)
}
