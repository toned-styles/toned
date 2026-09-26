import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DesignChange } from '../model.ts'
import { parseEditRequest, parseQuery } from '../requests.ts'
import type { SourceBridge } from './index.ts'

export interface SourceBridgeHttpOptions {
  readonly endpoint?: string
  /** Exact trusted development origin, including port. Callback supports port 0 servers. */
  readonly origin: string | (() => string)
  /** Unpredictable capability, at least 32 characters. Never put this in a query string. */
  readonly token: string
  readonly maxBodyBytes?: number
  readonly maxConcurrentRequests?: number
  readonly requestTimeoutMs?: number
}
export function createSourceBridgeHandler(
  bridge: SourceBridge,
  options: SourceBridgeHttpOptions,
) {
  const endpoint = options.endpoint ?? '/__toned/source'
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(endpoint))
    throw new Error('Toned bridge: invalid endpoint')
  if (options.token.length < 32 || options.token.length > 512)
    throw new Error('Toned bridge: capability must be 32..512 characters')
  const max = options.maxBodyBytes ?? 131072
  if (!Number.isSafeInteger(max) || max < 1 || max > 1_000_000)
    throw new Error('Toned bridge: invalid request body budget')
  const concurrency = options.maxConcurrentRequests ?? 16,
    timeout = options.requestTimeoutMs ?? 10000
  if (
    !Number.isSafeInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 128 ||
    !Number.isSafeInteger(timeout) ||
    timeout < 1 ||
    timeout > 60000
  )
    throw new Error('Toned bridge: invalid HTTP concurrency/time budget')
  let active = 0
  return (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void = () => {
      response.statusCode = 404
      response.end()
    },
  ) => {
    if (request.url?.split('?')[0] !== endpoint) {
      next()
      return
    }
    void (async () => {
      const reply = (status: number, value: unknown) => {
        if (response.destroyed || response.writableEnded) return
        response.statusCode = status
        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.end(JSON.stringify(value))
      }
      if (request.method !== 'POST') {
        reply(405, { error: 'Toned bridge requires POST' })
        return
      }
      const expected = Buffer.from(`Bearer ${options.token}`),
        actual = Buffer.from(request.headers.authorization ?? '')
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      ) {
        reply(401, { error: 'Unauthorized source bridge request' })
        return
      }
      let origin: string
      try {
        const value =
          typeof options.origin === 'function'
            ? options.origin()
            : options.origin
        const parsed = new URL(value)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
        origin = parsed.origin
      } catch {
        reply(503, { error: 'Source bridge development origin is unavailable' })
        return
      }
      if (
        request.headers.origin !== origin ||
        request.headers['sec-fetch-site'] === 'cross-site'
      ) {
        reply(403, { error: 'Source bridge origin refused' })
        return
      }
      if (
        request.headers['content-type']?.split(';')[0]?.trim() !==
          'application/json' ||
        (request.headers['content-encoding'] &&
          request.headers['content-encoding'] !== 'identity')
      ) {
        reply(415, { error: 'Expected uncompressed application/json' })
        return
      }
      const declared = request.headers['content-length']
      if (declared && (!/^\d+$/.test(declared) || Number(declared) > max)) {
        reply(413, { error: 'Source bridge request body budget exceeded' })
        return
      }
      if (active >= concurrency) {
        reply(429, { error: 'Source bridge request budget exceeded' })
        return
      }
      active++
      const controller = new AbortController()
      const timer = setTimeout(() => {
        controller.abort()
        reply(408, { error: 'Source bridge request timed out' })
        request.destroy()
      }, timeout)
      const abort = () => controller.abort()
      const close = () => {
        if (!response.writableEnded) controller.abort()
      }
      request.once('aborted', abort)
      response.once('close', close)
      try {
        let bytes = 0
        const chunks: Buffer[] = []
        for await (const chunk of request) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          bytes += buffer.length
          if (bytes > max) {
            reply(413, { error: 'Source bridge request body budget exceeded' })
            return
          }
          chunks.push(buffer)
        }
        controller.signal.throwIfAborted()
        const parsed: unknown = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            Buffer.concat(chunks),
          ),
        )
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          throw new Error('Expected a source bridge request object')
        const message = parsed as Record<string, unknown>,
          input = message['input']
        let result: unknown
        if (message['method'] === 'query') {
          const query = parseQuery(input)
          result = await bridge.query(
            { ...query, limit: query.limit ?? 100 },
            controller.signal,
          )
        } else if (message['method'] === 'document') {
          if (
            !input ||
            typeof input !== 'object' ||
            typeof (input as Record<string, unknown>)['uri'] !== 'string'
          )
            throw new Error('Expected document URI')
          result = await bridge.document(
            (input as { uri: string }).uri,
            controller.signal,
          )
        } else if (message['method'] === 'propose') {
          const edit = parseEditRequest(input)
          result = await bridge.propose(
            { ...edit, scope: { ...edit.scope, path: edit.scope.path ?? [] } },
            controller.signal,
          )
        } else if (message['method'] === 'apply') {
          if (
            !input ||
            typeof input !== 'object' ||
            typeof (input as Record<string, unknown>)['proposalId'] !== 'string'
          )
            throw new Error('Expected a server-issued proposal')
          result = await bridge.apply(input as DesignChange, controller.signal)
        } else throw new Error('Unknown source bridge method')
        reply(200, { result })
      } catch (cause) {
        reply(400, {
          error: cause instanceof Error ? cause.message : String(cause),
        })
      } finally {
        clearTimeout(timer)
        active--
        request.removeListener('aborted', abort)
        response.removeListener('close', close)
      }
    })()
  }
}
