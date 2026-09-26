import { type JsonObject, type JsonValue, object, snapshot } from './json.ts'

export type { JsonObject, JsonValue } from './json.ts'
export type { ResolvedTokenContext } from './resolver.ts'
export { resolveDtcgContext } from './resolver.ts'
export interface TokenDiagnostic {
  readonly code:
    | 'invalid-document'
    | 'invalid-token'
    | 'unsupported-type'
    | 'unsupported-feature'
    | 'missing-reference'
    | 'circular-reference'
    | 'type-mismatch'
    | 'invalid-context'
  readonly path: readonly string[]
  readonly message: string
}
export interface InterchangeToken {
  readonly path: readonly string[]
  readonly type?: string
  readonly authored: JsonObject
  /** Resolved DTCG data, not an arbitrary Toned resolver's theme schema. */
  readonly value?: JsonValue
}
export interface TokenLibrary {
  readonly version: '2025.10'
  readonly document: JsonObject
  readonly tokens: readonly InterchangeToken[]
  readonly diagnostics: readonly TokenDiagnostic[]
  /** True means all tokens resolve in this implementation's documented subset. */
  readonly resolved: boolean
}
const supported = new Set([
  'number',
  'dimension',
  'duration',
  'color',
  'fontFamily',
  'fontWeight',
  'cubicBezier',
])
const numeric = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
function validValue(type: string, value: JsonValue): boolean {
  if (type === 'number') return numeric(value)
  if (type === 'dimension' || type === 'duration')
    return (
      object(value) &&
      numeric(value['value']) &&
      (type === 'dimension' ? ['px', 'rem'] : ['ms', 's']).includes(
        value['unit'] as string,
      ) &&
      (type !== 'duration' || value['value'] >= 0)
    )
  if (type === 'fontFamily')
    return (
      typeof value === 'string' ||
      (Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => typeof item === 'string'))
    )
  if (type === 'fontWeight')
    return (
      (numeric(value) && value >= 1 && value <= 1000) ||
      (typeof value === 'string' &&
        [
          'thin',
          'hairline',
          'extra-light',
          'ultra-light',
          'light',
          'normal',
          'regular',
          'book',
          'medium',
          'semi-bold',
          'demi-bold',
          'bold',
          'extra-bold',
          'ultra-bold',
          'black',
          'heavy',
          'extra-black',
          'ultra-black',
        ].includes(value))
    )
  if (type === 'cubicBezier')
    return (
      Array.isArray(value) &&
      value.length === 4 &&
      value.every(numeric) &&
      value[0]! >= 0 &&
      value[0]! <= 1 &&
      value[2]! >= 0 &&
      value[2]! <= 1
    )
  if (type === 'color')
    return (
      object(value) &&
      value['colorSpace'] === 'srgb' &&
      Array.isArray(value['components']) &&
      value['components'].length === 3 &&
      value['components'].every((c) => numeric(c) && c >= 0 && c <= 1) &&
      (value['alpha'] === undefined ||
        (numeric(value['alpha']) && value['alpha'] >= 0 && value['alpha'] <= 1))
    )
  return false
}

/** Lossless JSON structure preservation plus strict resolution of a declared subset.
 * Unsupported source constructs remain exportable and carry diagnostics. */
export function importDtcg(input: unknown): TokenLibrary {
  const document = snapshot(input)
  if (!object(document))
    throw new Error('Toned DTCG: token document must be an object')
  const diagnostics: TokenDiagnostic[] = [],
    tokens: InterchangeToken[] = []
  const entries = new Map<
    string,
    { path: string[]; type?: string; authored: JsonObject }
  >()
  const diagnostic = (
    code: TokenDiagnostic['code'],
    path: readonly string[],
    message: string,
  ) => {
    diagnostics.push({ code, path, message })
  }
  const metadata = (node: JsonObject, path: string[]) => {
    if (
      node['$description'] !== undefined &&
      typeof node['$description'] !== 'string'
    )
      diagnostic('invalid-token', path, '$description must be a string')
    if (node['$extensions'] !== undefined && !object(node['$extensions']))
      diagnostic('invalid-token', path, '$extensions must be an object')
    if (
      node['$deprecated'] !== undefined &&
      typeof node['$deprecated'] !== 'string' &&
      typeof node['$deprecated'] !== 'boolean'
    )
      diagnostic(
        'invalid-token',
        path,
        '$deprecated must be a string or boolean',
      )
  }
  const visit = (group: JsonObject, path: string[], inherited?: string) => {
    metadata(group, path)
    const ownType = group['$type']
    const type = typeof ownType === 'string' ? ownType : inherited
    if (ownType !== undefined && typeof ownType !== 'string')
      diagnostic('invalid-token', path, '$type must be a string')
    for (const [key, value] of Object.entries(group)) {
      if (key === '$extends' || key === '$ref')
        diagnostic(
          'unsupported-feature',
          path,
          `${key} group expansion is preserved but not resolved`,
        )
      else if (
        key.startsWith('$') &&
        ![
          '$type',
          '$description',
          '$extensions',
          '$deprecated',
          '$root',
        ].includes(key) &&
        key !== '$value'
      )
        diagnostic(
          'unsupported-feature',
          [...path, key],
          'Unknown reserved property is preserved',
        )
      if (key.startsWith('$') && key !== '$root') continue
      const next = [...path, key]
      if (key !== '$root' && /[.{}]/.test(key))
        diagnostic(
          'invalid-token',
          next,
          'Token/group names cannot contain dot or braces',
        )
      if (!object(value)) {
        diagnostic('invalid-token', next, 'Token/group must be an object')
        continue
      }
      if (Object.hasOwn(value, '$value')) {
        metadata(value, next)
        if (value['$type'] !== undefined && typeof value['$type'] !== 'string')
          diagnostic('invalid-token', next, '$type must be a string')
        const tokenType =
          typeof value['$type'] === 'string' ? value['$type'] : type
        entries.set(next.join('.'), {
          path: next,
          type: tokenType,
          authored: value,
        })
        for (const property of Object.keys(value))
          if (
            ![
              '$value',
              '$type',
              '$description',
              '$extensions',
              '$deprecated',
            ].includes(property)
          )
            diagnostic(
              'unsupported-feature',
              [...next, property],
              'Unknown token property is preserved',
            )
      } else if (key === '$root')
        diagnostic('invalid-token', next, '$root must be a token')
      else visit(value, next, type)
    }
  }
  if (Object.hasOwn(document, '$value'))
    diagnostic(
      'invalid-document',
      [],
      'The document root must be a group, not a token',
    )
  visit(document, [])
  const resolved = new Map<string, JsonValue | undefined>(),
    active = new Set<string>()
  const resolve = (key: string): JsonValue | undefined => {
    if (resolved.has(key)) return resolved.get(key)
    const entry = entries.get(key)
    if (!entry) return undefined
    if (active.size >= 64) {
      diagnostic(
        'unsupported-feature',
        entry.path,
        'Alias chain exceeds depth budget 64',
      )
      return undefined
    }
    if (active.has(key)) {
      diagnostic(
        'circular-reference',
        entry.path,
        `Circular token alias at ${key}`,
      )
      return undefined
    }
    active.add(key)
    let type = entry.type,
      value: JsonValue | undefined = entry.authored['$value']
    if (typeof value === 'string' && /^\{[^{}]+\}$/.test(value)) {
      const target = value.slice(1, -1),
        referenced = entries.get(target)
      if (!referenced) {
        diagnostic(
          'missing-reference',
          entry.path,
          `Unknown token alias ${target}`,
        )
        value = undefined
      } else {
        value = resolve(target)
        type ??= referenced.type
        if (entry.type && referenced.type && entry.type !== referenced.type) {
          diagnostic(
            'type-mismatch',
            entry.path,
            `Alias type ${entry.type} differs from ${referenced.type}`,
          )
          value = undefined
        }
      }
    } else if (object(value) && Object.hasOwn(value, '$ref')) {
      diagnostic(
        'unsupported-feature',
        entry.path,
        'JSON Pointer/property references are preserved but not resolved',
      )
      value = undefined
    }
    if (!type) {
      diagnostic(
        'invalid-token',
        entry.path,
        'Token needs an explicit, inherited or alias target type',
      )
      value = undefined
    } else if (!supported.has(type)) {
      diagnostic(
        'unsupported-type',
        entry.path,
        `Type ${type} is preserved but not resolved`,
      )
      value = undefined
    } else if (value !== undefined && !validValue(type, value)) {
      diagnostic(
        type === 'color' && object(value) && value['colorSpace'] !== 'srgb'
          ? 'unsupported-feature'
          : 'invalid-token',
        entry.path,
        type === 'color'
          ? 'Only numeric sRGB components and alpha can be resolved; other color spaces/components remain preserved'
          : `Invalid ${type} value`,
      )
      value = undefined
    }
    entry.type = type
    active.delete(key)
    resolved.set(key, value)
    return value
  }
  for (const [key, entry] of entries) {
    const value = resolve(key)
    tokens.push(
      Object.freeze({
        path: Object.freeze(entry.path),
        type: entry.type,
        authored: entry.authored,
        ...(value !== undefined ? { value } : {}),
      }),
    )
  }
  return Object.freeze({
    version: '2025.10',
    document,
    tokens: Object.freeze(tokens),
    diagnostics: Object.freeze(
      diagnostics.map((d) =>
        Object.freeze({ ...d, path: Object.freeze([...d.path]) }),
      ),
    ),
    resolved: diagnostics.length === 0,
  })
}

/** Does not flatten aliases or groups; serializable metadata is retained exactly. */
export function exportDtcg(library: TokenLibrary): JsonObject {
  return snapshot(library.document) as JsonObject
}

/** Explicit mapping is necessary: each Toned token resolver owns its theme schema.
 * The mapper receives validated DTCG data and may convert units/colors as needed. */
export function mapDtcgTokens<Value>(
  library: TokenLibrary,
  map: (
    token: InterchangeToken & { readonly value: JsonValue },
  ) => readonly [string, Value] | undefined,
): Readonly<Record<string, Value>> {
  if (!library.resolved)
    throw new Error('Toned DTCG: resolve all diagnostics before mapping tokens')
  const result: Record<string, Value> = Object.create(null)
  for (const token of library.tokens) {
    if (token.value === undefined)
      throw new Error('Toned DTCG: unresolved token')
    const entry = map(token as InterchangeToken & { readonly value: JsonValue })
    if (!entry) continue
    if (Object.hasOwn(result, entry[0]))
      throw new Error(`Toned DTCG: duplicate mapped name ${entry[0]}`)
    result[entry[0]] = entry[1]
  }
  return Object.freeze(result)
}
