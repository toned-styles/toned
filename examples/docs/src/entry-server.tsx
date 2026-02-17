import '../toned.config.ts'

import themeCss from '@toned/themes/shadcn/config.css?raw'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { PassThrough } from 'node:stream'
import { StrictMode } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { generate } from '@toned/core/dom'
import { system } from '@toned/systems/base'
import { routeTree } from './routeTree.gen'

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

    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
      {
        onAllReady() {
          pipe(passthrough)
        },
        onError: reject,
      },
    )
  })
}

export function generateCss() {
  return themeCss + generate(system)
}
