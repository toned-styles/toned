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
    const type = response.headers
      .get('content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase()
    if (type !== 'application/json')
      throw new Error(
        `Source bridge returned HTTP ${response.status}: expected application/json; check the development bridge endpoint`,
      )
    let payload: { result?: T; error?: string }
    try {
      const parsed: unknown = await response.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error()
      payload = parsed as typeof payload
    } catch {
      signal.throwIfAborted()
      throw new Error(
        `Source bridge returned HTTP ${response.status}: invalid JSON response`,
      )
    }
    if (!response.ok || payload.error)
      throw new Error(
        typeof payload.error === 'string'
          ? `Source bridge returned HTTP ${response.status}: ${payload.error}`
          : `Source bridge returned HTTP ${response.status}`,
      )
    if (!Object.hasOwn(payload, 'result'))
      throw new Error('Source bridge returned no result')
    return payload.result as T
  }
  return {
    query: (input, signal) => send('query', input, signal),
    document: (uri, signal) => send('document', { uri }, signal),
    definition: (input, signal) => send('definition', input, signal),
    propose: (input, signal) => send('propose', input, signal),
    apply: (input, signal) => send('apply', input, signal),
  }
}
