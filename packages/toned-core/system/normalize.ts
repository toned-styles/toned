import { immutableSnapshot } from '../utils/immutable.ts'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

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
        ? immutableSnapshot(value)
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
    containers?: Record<string, Record<string, number | string>>
    states?: Record<string, string>
  },
): void {
  const knownStates = new Set([
    'hover',
    'active',
    'focus',
    'focus-visible',
    'focus-within',
    ...Object.keys(system.states ?? {}),
  ])
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!isRecord(node)) return
    if (node['op'] === 'atom' && typeof node['key'] === 'string')
      walk({ [node['key']]: {} })
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('@platform.')) {
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
            if (!(container! in (system.breakpoints?.__breakpoints ?? {})))
              throw new Error(`Toned: undeclared media condition ${key}`)
          } else if (
            !system.containers?.[container!] ||
            !(step in system.containers[container!]!)
          ) {
            throw new Error(
              `Toned: undeclared container condition ${key}; portable conditions must be named fixed thresholds`,
            )
          }
        }
      } else if (key.includes(':') && !key.startsWith('[')) {
        for (const state of key.slice(key.indexOf(':') + 1).split(':')) {
          if (!knownStates.has(state.replace(/^(src|sib)-/, '')))
            throw new Error(`Toned: undeclared state ${state}`)
        }
      }
      if (key !== 'style' && key !== '$grid' && key !== '$area') walk(value)
    }
    for (const symbol of Object.getOwnPropertySymbols(node))
      walk((node as Record<symbol, unknown>)[symbol])
  }
  walk(input)
}
