import { randomBytes } from 'node:crypto'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createSourceBridgeHandler } from './http.ts'
import { createSourceBridge, type SourceBridgeOptions } from './index.ts'

/** Structural Vite plugin type keeps Vite optional. Source writes exist only in serve mode. */
export function sourceBridgePlugin(
  options: SourceBridgeOptions & {
    readonly origin: string | (() => string)
    readonly endpoint?: string
  },
) {
  const token = randomBytes(32).toString('hex'),
    endpoint = options.endpoint ?? '/__toned/source'
  const moduleId = 'virtual:toned-source-bridge',
    resolved = `\0${moduleId}`
  let dispose: (() => Promise<void>) | undefined
  return {
    name: 'toned-source-bridge',
    apply: 'serve' as const,
    resolveId(id: string) {
      return id === moduleId ? resolved : undefined
    },
    load(id: string) {
      return id === resolved
        ? `export const endpoint = ${JSON.stringify(endpoint)}; export const token = ${JSON.stringify(token)};`
        : undefined
    },
    async configureServer(server: {
      readonly middlewares: {
        use(
          handler: (
            request: IncomingMessage,
            response: ServerResponse,
            next: () => void,
          ) => void,
        ): void
      }
      readonly httpServer?: Server | null
    }) {
      await dispose?.()
      const bridge = await createSourceBridge(options)
      dispose = () => bridge.dispose()
      server.httpServer?.once('close', () => {
        void bridge.dispose()
      })
      // Install after Vite's own host/access checks. The transport adds capability
      // and exact-origin checks; it never adds permissive CORS response headers.
      return () =>
        server.middlewares.use(
          createSourceBridgeHandler(bridge, {
            endpoint,
            origin: options.origin,
            token,
          }),
        )
    },
    closeBundle() {
      return dispose?.()
    },
  }
}
