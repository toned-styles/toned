import type { DesignKind, DesignValue } from './model.ts'

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected an object')
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error('Expected plain JSON data')
  return value as Record<string, unknown>
}
function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value || value.length > 8192)
    throw new Error(`Invalid ${name}`)
  return value
}
function integer(value: unknown, name: string, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > max
  )
    throw new Error(`Invalid ${name}`)
  return value
}
export function parseQuery(value: unknown) {
  const input = record(value ?? {})
  const kind = input['kind']
  if (
    kind !== undefined &&
    !['system', 'token', 'sheet', 'part', 'declaration', 'family'].includes(
      kind as string,
    )
  )
    throw new Error('Invalid design kind')
  return {
    kind: kind as DesignKind | undefined,
    uri: input['uri'] === undefined ? undefined : text(input['uri'], 'URI'),
    owner:
      input['owner'] === undefined ? undefined : text(input['owner'], 'owner'),
    name: input['name'] === undefined ? undefined : text(input['name'], 'name'),
    offset:
      input['offset'] === undefined
        ? undefined
        : integer(input['offset'], 'offset', Number.MAX_SAFE_INTEGER),
    limit:
      input['limit'] === undefined
        ? undefined
        : integer(input['limit'], 'limit', 500),
  }
}
export function parseEditRequest(value: unknown): {
  nodeId: string
  value: DesignValue
  expectedVersion: number
  scope: { uri: string; owner: string; path?: readonly string[] }
} {
  const input = record(value),
    scope = record(input['scope'])
  let nodes = 0,
    characters = 0
  const visit = (item: unknown, depth: number): DesignValue => {
    if (++nodes > 10000 || depth > 24)
      throw new Error('Edit value exceeds structural budget')
    if (typeof item === 'string') {
      characters += item.length
      if (characters > 100000)
        throw new Error('Edit value exceeds character budget')
      return item
    }
    if (
      item === null ||
      typeof item === 'boolean' ||
      (typeof item === 'number' && Number.isFinite(item))
    )
      return item
    if (Array.isArray(item)) return item.map((child) => visit(child, depth + 1))
    const source = record(item),
      output: Record<string, DesignValue> = Object.create(null)
    for (const [key, child] of Object.entries(source)) {
      characters += key.length
      if (characters > 100000)
        throw new Error('Edit value exceeds character budget')
      output[key] = visit(child, depth + 1)
    }
    return output
  }
  let path: string[] | undefined
  if (scope['path'] !== undefined) {
    if (!Array.isArray(scope['path']) || scope['path'].length > 64)
      throw new Error('Invalid declaration path')
    path = scope['path'].map((part) => text(part, 'path segment'))
  }
  return {
    nodeId: text(input['nodeId'], 'node id'),
    value: visit(input['value'], 0),
    expectedVersion: integer(
      input['expectedVersion'],
      'document version',
      Number.MAX_SAFE_INTEGER,
    ),
    scope: {
      uri: text(scope['uri'], 'scope URI'),
      owner: text(scope['owner'], 'scope owner'),
      path,
    },
  }
}
