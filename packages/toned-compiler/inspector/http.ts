import type { InspectorTransport } from './index.ts'

/** Browser client for the development-only source bridge. Auth stays in a header. */
export function createHttpInspectorTransport(options: {
  readonly endpoint: string
  readonly token: string
}): InspectorTransport {
  const endpoint = new URL(options.endpoint, globalThis.location.href)
  if (
    endpoint.origin !== globalThis.location.origin ||
    endpoint.username ||
    endpoint.password
  )
    throw new Error('Source bridge transport requires a same-origin endpoint')
  const send = async <T>(
    method: string,
    input: unknown,
    signal: AbortSignal,
  ): Promise<T> => {
    const response = await fetch(endpoint.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.token}`,
      },
      body: JSON.stringify({ method, input }),
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
    })
    const payload = (await response.json()) as { result?: T; error?: string }
    if (!response.ok || payload.error)
      throw new Error(
        payload.error ?? `Source bridge returned ${response.status}`,
      )
    if (!Object.hasOwn(payload, 'result'))
      throw new Error('Source bridge returned no result')
    return payload.result as T
  }
  return {
    query: (input, signal) => send('query', input, signal),
    document: (uri, signal) => send('document', { uri }, signal),
    propose: (input, signal) => send('propose', input, signal),
    apply: (input, signal) => send('apply', input, signal),
  }
}
