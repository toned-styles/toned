import { importDtcg, type TokenDiagnostic, type TokenLibrary } from './index.ts'
import { type JsonObject, type JsonValue, object, snapshot } from './json.ts'

export interface ResolvedTokenContext {
  readonly document: JsonObject
  readonly library: TokenLibrary
  readonly context: Readonly<Record<string, string>>
  readonly diagnostics: readonly TokenDiagnostic[]
  readonly resolved: boolean
}
/** Resolve one explicit 2025.10 context, never its Cartesian product. All external
 * sources are caller-supplied JSON; this pure function performs no I/O. */
export function resolveDtcgContext(
  input: unknown,
  options: {
    readonly context?: Readonly<Record<string, string>>
    readonly sources?: Readonly<Record<string, unknown>>
  } = {},
): ResolvedTokenContext {
  const document = snapshot(input)
  if (!object(document))
    throw new Error('Toned DTCG: resolver document must be an object')
  const diagnostics: TokenDiagnostic[] = []
  const context: Record<string, string> = Object.create(null)
  const fail = (
    code: TokenDiagnostic['code'],
    path: string[],
    message: string,
  ) => {
    diagnostics.push({ code, path, message })
  }
  if (document['version'] !== '2025.10')
    fail('invalid-document', ['version'], 'Expected resolver version 2025.10')
  const sets = object(document['sets']) ? document['sets'] : {},
    modifiers = object(document['modifiers']) ? document['modifiers'] : {}
  for (const name of Object.keys(options.context ?? {}))
    if (!Object.hasOwn(modifiers, name))
      fail('invalid-context', ['modifiers', name], 'Unknown modifier selection')
  const merged: Record<string, JsonValue> = Object.create(null)
  let steps = 0,
    mergedFields = 0
  const active = new Set<string>(),
    sourceCache = new Map<string, JsonObject>()
  // Only this accumulator is mutable. Clone group containers once on insertion;
  // frozen source snapshots and token/metadata payloads remain untouched.
  const merge = (
    result: Record<string, JsonValue>,
    after: JsonObject,
  ): void => {
    for (const [key, value] of Object.entries(after)) {
      if (++mergedFields > 200000)
        throw new Error('Toned DTCG: merged field budget exceeded')
      const previous = result[key]
      if (
        !key.startsWith('$') &&
        object(value) &&
        !Object.hasOwn(value, '$value')
      ) {
        const group: Record<string, JsonValue> =
          object(previous) && !Object.hasOwn(previous, '$value')
            ? previous
            : Object.create(null)
        merge(group, value)
        result[key] = group
      } else result[key] = value
    }
  }
  const source = (value: JsonValue, path: string[]): void => {
    if (++steps > 10000)
      throw new Error('Toned DTCG: resolver expansion budget exceeded')
    if (!object(value)) {
      fail('invalid-document', path, 'Expected a token source object')
      return
    }
    if (Object.hasOwn(value, '$ref')) {
      const ref = value['$ref']
      if (typeof ref !== 'string') {
        fail('invalid-document', path, '$ref must be a string')
        return
      }
      if (Object.keys(value).some((key) => key !== '$ref'))
        fail(
          'unsupported-feature',
          path,
          'Reference sibling overrides are preserved in the input but not applied',
        )
      if (active.size >= 64) {
        fail(
          'unsupported-feature',
          path,
          'Reference chain exceeds depth budget 64',
        )
        return
      }
      if (active.has(ref)) {
        fail('circular-reference', path, `Circular resolver reference ${ref}`)
        return
      }
      active.add(ref)
      if (ref.startsWith('#/sets/')) {
        const name = ref.slice(7).replace(/~1/g, '/').replace(/~0/g, '~')
        if (!Object.hasOwn(sets, name))
          fail('missing-reference', path, `Unknown set ${name}`)
        else set(sets[name]!, [...path, ref])
      } else if (ref.includes('#'))
        fail(
          'unsupported-feature',
          path,
          'Only local set references and whole external documents are supported in sources',
        )
      else if (!Object.hasOwn(options.sources ?? {}, ref))
        fail(
          'missing-reference',
          path,
          `Supply source ${ref} explicitly; network loading is disabled`,
        )
      else {
        let tokens = sourceCache.get(ref)
        if (!tokens) {
          if (sourceCache.size >= 128)
            throw new Error(
              'Toned DTCG: at most 128 external sources per context',
            )
          const loaded = snapshot(options.sources![ref])
          if (!object(loaded))
            fail('invalid-document', path, `Source ${ref} is not an object`)
          else {
            tokens = loaded
            sourceCache.set(ref, loaded)
          }
        }
        if (tokens) merge(merged, tokens)
      }
      active.delete(ref)
    } else merge(merged, value)
  }
  const sources = (value: JsonValue | undefined, path: string[]) => {
    if (!Array.isArray(value)) {
      fail('invalid-document', path, 'Expected ordered sources array')
      return
    }
    value.forEach((entry, index) => {
      source(entry, [...path, String(index)])
    })
  }
  const set = (value: JsonValue, path: string[]) => {
    if (!object(value)) {
      fail('invalid-document', path, 'Expected set object')
      return
    }
    sources(value['sources'], [...path, 'sources'])
  }
  const modifier = (name: string, value: JsonValue, path: string[]) => {
    if (!object(value) || !object(value['contexts'])) {
      fail('invalid-document', path, 'Modifier needs a contexts map')
      return
    }
    const contexts = value['contexts']
    if (!Object.keys(contexts).length) {
      fail('invalid-context', path, 'Modifier contexts cannot be empty')
      return
    }
    const fallback = value['default']
    if (
      fallback !== undefined &&
      (typeof fallback !== 'string' || !Object.hasOwn(contexts, fallback))
    ) {
      fail(
        'invalid-context',
        path,
        'Modifier default must name a declared context',
      )
      return
    }
    const selected = options.context?.[name] ?? fallback
    if (typeof selected !== 'string' || !Object.hasOwn(contexts, selected)) {
      fail('invalid-context', path, `Select a declared context for ${name}`)
      return
    }
    context[name] = selected
    sources(contexts[selected], [...path, 'contexts', selected])
  }
  const inlineNames = new Set<string>()
  const order = document['resolutionOrder']
  if (!Array.isArray(order))
    fail(
      'invalid-document',
      ['resolutionOrder'],
      'Expected resolutionOrder array',
    )
  else
    for (const [index, entry] of order.entries()) {
      const path = ['resolutionOrder', String(index)]
      if (!object(entry)) {
        fail('invalid-document', path, 'Expected set, modifier or reference')
        continue
      }
      const ref = entry['$ref']
      if (typeof ref === 'string' && ref.startsWith('#/modifiers/')) {
        if (Object.keys(entry).some((key) => key !== '$ref'))
          fail(
            'unsupported-feature',
            path,
            'Reference sibling overrides are not applied',
          )
        const name = ref.slice(12).replace(/~1/g, '/').replace(/~0/g, '~')
        if (!Object.hasOwn(modifiers, name))
          fail('missing-reference', path, `Unknown modifier ${name}`)
        else modifier(name, modifiers[name]!, path)
      } else if (typeof ref === 'string' && ref.startsWith('#/sets/'))
        source(entry, path)
      else if (entry['type'] === 'set' && typeof entry['name'] === 'string') {
        if (inlineNames.has(entry['name']))
          fail(
            'invalid-document',
            path,
            'Inline resolutionOrder names must be unique',
          )
        else {
          inlineNames.add(entry['name'])
          set(entry, path)
        }
      } else
        fail(
          'unsupported-feature',
          path,
          'Use named local set/modifier references or inline sets in resolutionOrder',
        )
    }
  const library = importDtcg(merged)
  const all = Object.freeze([...diagnostics, ...library.diagnostics])
  return Object.freeze({
    document,
    library: Object.freeze({
      ...library,
      diagnostics: all,
      resolved: all.length === 0,
    }),
    context: Object.freeze(context),
    diagnostics: all,
    resolved: all.length === 0,
  })
}
