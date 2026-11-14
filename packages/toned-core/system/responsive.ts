/**
 * Declared responsive pairs: which conditions each responsive token emits
 * atoms for.
 *
 * `responsiveTokens: { maxW: ['md', 'lg'] }` emits `@md:maxW_*` and
 * `@lg:maxW_*` and nothing else; a sheet setting `maxW` directly under another
 * named condition is refused (types/stylesheet.ts at compile time,
 * backends/css/plan.ts at resolve). The legacy list form,
 * `responsiveTokens: ['maxW']`, still emits the token under EVERY declared
 * condition, so a system that has not declared its pairs builds the same CSS
 * as before.
 *
 * The pairs come from the system declaration alone: the build never scans
 * stylesheets to find which pairs are used.
 *
 * @module system/responsive
 */

import type { ResponsiveTokens } from '../types/tokens.ts'

/** Token → its declared conditions, or `null` for every condition. */
export type ResponsivePairs = ReadonlyMap<string, ReadonlySet<string> | null>

const cache = new WeakMap<object, ResponsivePairs>()

const quoted = (names: Iterable<string>) =>
  [...names].map((name) => `'${name}'`).join(', ')

/**
 * Reads (and on first read validates) a declaration's responsive pairs. The
 * record form must name real enumerated tokens and declared conditions; the
 * legacy list keeps its old leniency (an unknown name emits nothing).
 */
export function responsivePairs(declaration: {
  readonly responsiveTokens?: ResponsiveTokens
  readonly breakpoints?: { readonly __breakpoints: Record<string, unknown> }
  readonly [token: string]: unknown
}): ResponsivePairs {
  const cached = cache.get(declaration)
  if (cached) return cached
  const declared = declaration.responsiveTokens
  const pairs = new Map<string, ReadonlySet<string> | null>()
  if (Array.isArray(declared)) {
    for (const token of declared as readonly string[]) pairs.set(token, null)
  } else if (declared) {
    const conditions = Object.keys(declaration.breakpoints?.__breakpoints ?? {})
    for (const [token, names] of Object.entries(
      declared as Readonly<Record<string, readonly string[]>>,
    )) {
      const config = declaration[token]
      if (
        !config ||
        typeof config !== 'object' ||
        !('values' in config) ||
        !('resolve' in config)
      )
        throw new Error(
          `Toned: responsiveTokens names '${token}', which is not a token with enumerated values`,
        )
      for (const name of names)
        if (!conditions.includes(name))
          throw new Error(
            `Toned: responsiveTokens.${token} names '${name}', which is not a declared condition. Declared: ${quoted(conditions) || 'none'}`,
          )
      pairs.set(token, new Set(names))
    }
  }
  // Only a frozen declaration (a defined system's) cannot change under the cache.
  if (Object.isFrozen(declaration)) cache.set(declaration, pairs)
  return pairs
}

/** The refusal for a responsive token set under a condition it does not declare. */
export function undeclaredPairMessage(
  part: string,
  token: string,
  condition: string,
  declared: ReadonlySet<string>,
): string {
  return `Toned: part '${part}' sets ${token} under '@${condition}', which has no responsive atom: responsiveTokens declares ${token} for ${quoted(declared) || 'no condition'} only. Add '${condition}' to responsiveTokens.${token}, or move the value out of '@${condition}'`
}
