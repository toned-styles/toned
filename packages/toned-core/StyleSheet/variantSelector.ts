/**
 * Variant selector proxy for type-safe variant definitions.
 *
 * @module stylesheet/variantSelector
 */

import type { ModType } from '../types/stylesheet.ts'

/** Marker for named style keys */
const NAMED_PREFIX = '$named$_' as const

/** Marker for unspecified optional variants (wildcard) */
const NONE_VALUE = '*' as const

type NoneValue = typeof NONE_VALUE

/**
 * Branded type for variant keys to ensure type safety
 */
export type VariantKey = string & { readonly __variantKey?: unique symbol }

/**
 * Named style key type
 */
export type NamedStyleKey<Name extends string> = `$named$_${Name}`

/**
 * Extract named style names from a variants result object
 */
export type ExtractNamedStyles<R> = {
  [K in keyof R]: K extends `$named$_${infer Name}` ? Name : never
}[keyof R]

/**
 * Keys that have been accumulated in a builder
 */
type AccumulatedKeys = Record<string, unknown>

/**
 * Builder methods for chaining variant selections
 */
type VariantBuilderMethods<
  Mods extends ModType,
  Acc extends AccumulatedKeys = {},
> = {
  /**
   * Select a variant value (or multiple values for OR semantics)
   */
  [K in Exclude<keyof Mods, keyof Acc> as K extends string
    ? K
    : never]: K extends string
    ? <const V extends Exclude<Mods[K], undefined>>(
        ...values: [V, ...V[]]
      ) => VariantBuilder<Mods, Acc & Record<K, V>>
    : never
}

/**
 * Variant builder - returned after each variant selection
 * Allows chaining additional variant selections
 *
 * Intersected with `string` so it can be used as a computed property key.
 *
 * @template Mods - The full modifier type
 * @template Acc - Keys that have already been accumulated
 */
export type VariantBuilder<
  Mods extends ModType,
  Acc extends AccumulatedKeys = {},
> = string & VariantBuilderMethods<Mods, Acc>

/**
 * Variant selector - the `$` parameter in variants callback
 */
export type VariantSelector<Mods extends ModType> = {
  /**
   * Define a named style that can be composed
   * @example $("reusable_style")
   */
  <Name extends string>(name: Name): NamedStyleKey<Name>
} & {
  /**
   * Select a variant value (or multiple values for OR semantics)
   * @example $.size("m") or $.alignment("icon-only", "icon-left")
   */
  [K in keyof Mods as K extends string ? K : never]: K extends string
    ? <const V extends Exclude<Mods[K], undefined>>(
        ...values: [V, ...V[]]
      ) => VariantBuilder<Mods, Record<K, V>>
    : never
}

/**
 * Runtime state for the variant builder
 */
interface BuilderRuntime {
  orderedKeys: string[]
  accumulated: Record<string, unknown>
}

/**
 * Create a variant builder that generates stable keys
 */
function createBuilder(runtime: BuilderRuntime): VariantBuilder<ModType, {}> {
  const generateKey = (): string => {
    const segments: string[] = []

    for (const key of runtime.orderedKeys) {
      const value = runtime.accumulated[key]

      if (value === undefined) {
        // Optional variant not specified
        segments.push(`[${key}=${NONE_VALUE}]`)
      } else if (Array.isArray(value)) {
        // Multiple values - sort for stability, create separate segments
        const sorted = [...value].sort()
        for (const v of sorted) {
          segments.push(`[${key}=${v}]`)
        }
      } else {
        segments.push(`[${key}=${value}]`)
      }
    }

    return segments.join('')
  }

  return new Proxy({} as VariantBuilder<ModType, {}>, {
    get(_, prop) {
      if (prop === Symbol.toPrimitive || prop === 'toString') {
        return () => generateKey()
      }

      if (typeof prop === 'string') {
        // Return a function that adds this variant to accumulated state
        return (...values: unknown[]) => {
          const newAccumulated = {
            ...runtime.accumulated,
            [prop]: values.length === 1 ? values[0] : values,
          }

          return createBuilder({
            orderedKeys: runtime.orderedKeys,
            accumulated: newAccumulated,
          })
        }
      }

      return undefined
    },
  })
}

/**
 * Create a variant selector proxy
 *
 * @param orderedKeys - Keys in definition order (from the Mods type)
 * @returns The $ proxy for defining variants
 *
 * @example
 * ```ts
 * const $ = createVariantSelector(['size', 'variant', 'alignment'])
 *
 * // Named style
 * $("reusable_style") // => "$named$_reusable_style"
 *
 * // Single variant
 * $.size("m") // => "[size=m][variant=$NONE$][alignment=$NONE$]"
 *
 * // Compound variants
 * $.size("m").variant("accent") // => "[size=m][variant=accent][alignment=$NONE$]"
 *
 * // Multi-value (OR semantics)
 * $.alignment("icon-only", "icon-left") // => "[alignment=icon-left][alignment=icon-only][size=$NONE$][variant=$NONE$]"
 * ```
 */
export function createVariantSelector<Mods extends ModType>(
  orderedKeys: (keyof Mods)[],
): VariantSelector<Mods> {
  const keys = orderedKeys.map(String)

  const handler: ProxyHandler<(...args: unknown[]) => unknown> = {
    // Handle $("name") calls
    apply(_, __, args) {
      const name = args[0]
      if (typeof name === 'string') {
        return `${NAMED_PREFIX}${name}`
      }
      throw new Error('Named style requires a string name')
    },

    // Handle $.variant, $.size, etc.
    get(_, prop) {
      if (typeof prop === 'string') {
        // Return a function that starts a builder chain
        return (...values: unknown[]) => {
          const accumulated = {
            [prop]: values.length === 1 ? values[0] : values,
          }

          return createBuilder({
            orderedKeys: keys,
            accumulated,
          })
        }
      }

      return undefined
    },
  }

  // biome-ignore lint/suspicious/noExplicitAny: proxy requires flexible base function
  return new Proxy((() => {}) as any, handler)
}

/**
 * Check if a key is a named style key
 */
export function isNamedStyleKey(key: string): key is `$named$_${string}` {
  return key.startsWith(NAMED_PREFIX)
}

/**
 * Extract the name from a named style key
 */
export function getNamedStyleName(key: `$named$_${string}`): string {
  return key.slice(NAMED_PREFIX.length)
}

/**
 * Check if a selector segment represents $NONE$
 */
export function isNoneValue(value: string): value is NoneValue {
  return value === NONE_VALUE
}
