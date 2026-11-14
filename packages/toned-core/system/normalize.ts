import { fixedQueryWidth } from '../utils/conditions.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import type { QueryPredicate } from './queries.ts'
import { isQueryKey, queryExpression } from './query-key.ts'
import type { StateDeclaration } from './states.ts'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

/**
 * Folds a `$style` list into one style object: entries merge in order and the
 * last wins, and falsy entries (`cond && fragment`) are skipped. A `null`
 * value unsets what an earlier entry set; with nothing earlier in the list to
 * unset it is kept, so in `extend` it still removes the inherited property,
 * as the single form's `null` does.
 */
function foldStyleList(list: readonly unknown[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  list.forEach((entry, index) => {
    if (entry === false || entry === null || entry === undefined) return
    if (!isRecord(entry))
      throw new Error(
        `Toned: $style list entry ${index} is ${typeof entry === 'object' ? 'not a plain object' : `a ${typeof entry}`}; each entry is a style object, or false/null/undefined to skip it`,
      )
    for (const [property, value] of Object.entries(entry)) {
      if (value === null && property in out && out[property] !== null)
        delete out[property]
      else out[property] = value
    }
  })
  return out
}

/** Canonicalize author-facing aliases once, before matcher compilation. */
export function normalizeDeclarations<T>(input: T): T {
  if (!isRecord(input)) return input
  const out: Record<string, unknown> = {}
  if (
    '$kind' in input &&
    '$$type' in input &&
    input['$kind'] !== input['$$type']
  )
    throw new Error('Toned: $kind and $$type must agree')
  for (const key of Object.keys(input)) {
    if (key.startsWith('@platform.') && `@platform ${key.slice(10)}` in input)
      throw new Error(
        `Toned: '@platform ${key.slice(10)}' and its alias '${key}' are both written here, and one would replace the other; merge them into one '@platform ${key.slice(10)}' block`,
      )
  }
  for (const [key, value] of Object.entries(input)) {
    const canonical =
      key === '$kind'
        ? '$$type'
        : key === '$style'
          ? 'style'
          : key.startsWith('@media ')
            ? `@${key.slice(7)}`
            : key.startsWith('@container ')
              ? `@${key.slice(11).trim().replace(/\s+/g, '/')}`
              : key.startsWith('@platform ')
                ? `@platform.${key.slice(10)}`
                : key
    if (
      (key.startsWith(':') || key.startsWith('@')) &&
      isRecord(value) &&
      ('$kind' in value || '$$type' in value)
    )
      throw new Error(
        'Toned: part kind is static and cannot change inside a condition',
      )
    const normalized =
      canonical === 'style'
        ? immutableSnapshot(Array.isArray(value) ? foldStyleList(value) : value)
        : canonical === '$grid' || canonical === '$area'
          ? value
          : normalizeDeclarations(value)
    out[canonical] =
      canonical === 'style' && isRecord(out[canonical]) && isRecord(normalized)
        ? { ...out[canonical], ...normalized }
        : normalized
  }
  for (const symbol of Object.getOwnPropertySymbols(input)) {
    Object.defineProperty(
      out,
      symbol,
      Object.getOwnPropertyDescriptor(input, symbol)!,
    )
  }
  return out as T
}

/** Strict descriptors diagnose misspelled facts before an asset can be built. */
export function validateDeclarations(
  input: unknown,
  system: {
    breakpoints?: { __breakpoints: Record<string, number | string> }
    containers?: Record<string, Record<string, unknown>>
    states?: Record<string, StateDeclaration>
  },
): void {
  const builtInStates = [
    'hover',
    'active',
    'focus',
    'focus-visible',
    'focus-within',
  ]
  const declaredStates = Object.keys(system.states ?? {})
  const knownStates = new Set([...builtInStates, ...declaredStates])
  const quoted = (names: readonly string[], prefix: string) =>
    names.length ? names.map((name) => `'${prefix}${name}'`).join(', ') : 'none'
  const undeclaredState = (state: string, key: string) =>
    new Error(
      `Toned: undeclared state ':${state}' in '${key}'; declared states: ${quoted(declaredStates, ':')}; built-in: ${quoted(builtInStates, ':')}`,
    )
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!isRecord(node)) return
    if (node['op'] === 'atom' && typeof node['key'] === 'string')
      walk({ [node['key']]: {} })
    if (node['op'] === 'relation')
      validateQuery(node as unknown as QueryPredicate)
    for (const [key, value] of Object.entries(node)) {
      if (isQueryKey(key)) {
        validateQuery(queryExpression(key))
      } else if (key.startsWith('@platform.')) {
        if (!['web', 'native'].includes(key.slice(10)))
          throw new Error(`Toned: unknown platform ${key}`)
      } else if (key.startsWith('@')) {
        // Legacy boolean condition spelling may be retained at the sheet root.
        const atoms = key
          .slice(1)
          .split(/[&|]/)
          .map((atom) => atom.replace(/^!/, ''))
        for (const atom of atoms) {
          const [container, step] = atom.split('/')
          if (step === undefined) {
            if (
              fixedQueryWidth(container!) === undefined &&
              !(container! in (system.breakpoints?.__breakpoints ?? {}))
            )
              throw new Error(
                `Toned: undeclared media condition '${atom}' in '${key}'; declared media: ${quoted(Object.keys(system.breakpoints?.__breakpoints ?? {}), '@')}, or a width declared in conditions.widths (q.media(dp(600)))`,
              )
          } else if (
            !system.containers?.[container!] ||
            (fixedQueryWidth(step) === undefined &&
              !(step in system.containers[container!]!))
          ) {
            const declared = Object.entries(system.containers ?? {}).flatMap(
              ([name, steps]) => Object.keys(steps).map((s) => `${name}/${s}`),
            )
            throw new Error(
              `Toned: undeclared container condition '${atom}' in '${key}'; declared containers: ${quoted(declared, '@')}; portable conditions must be named fixed thresholds or explicit dp lengths`,
            )
          }
        }
      } else if (key.includes(':') && !key.startsWith('[')) {
        for (const state of key.slice(key.indexOf(':') + 1).split(':')) {
          if (!knownStates.has(state.replace(/^(src|sib)-/, '')))
            throw undeclaredState(state, key)
        }
      }
      if (
        key !== 'style' &&
        key !== '$grid' &&
        key !== '$area' &&
        key !== '$webRules'
      )
        walk(value)
    }
    for (const symbol of Object.getOwnPropertySymbols(node))
      walk((node as Record<symbol, unknown>)[symbol])
  }
  const validateQuery = (query: QueryPredicate): void => {
    if (query.op === 'atom') walk({ [query.key]: {} })
    else if (query.op === 'relation') {
      const { scope, state, sourcePart, part } = query.relation
      if (!sourcePart || !part || !['child', 'descendant'].includes(scope))
        throw new Error('Toned: malformed relation query')
      if (!knownStates.has(state))
        throw undeclaredState(state, `${sourcePart}:${state}`)
    } else if (query.op === 'not') validateQuery(query.operand)
    else for (const operand of query.operands) validateQuery(operand)
  }
  walk(input)
}
