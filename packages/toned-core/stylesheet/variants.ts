/**
 * A stylesheet's variant vocabulary, read from what the matcher reads: every
 * selector key in the sheet and in each of its derivation layers, plus its
 * declared defaults.
 *
 * @module stylesheet/variants
 */
import type { ModType } from '../types/stylesheet.ts'
import { SYMBOL_DEFAULTS } from '../utils/symbols.ts'
import { parseVariantSelector } from './matcher/normalizeRules.ts'
import { getStylesheetPlan } from './plans.ts'
import { declarationLayers } from './removals.ts'

type Meta<T> = T extends { readonly __toned__?: infer M } ? M : never
type ModsOf<T> = Meta<T> extends { mods: infer M extends ModType } ? M : never
/** A value as a selector carries it: booleans stay booleans, numbers are their text. */
type SelectorValue<V> = V extends boolean
  ? boolean
  : V extends string | number
    ? `${V}`
    : never

/**
 * Each variant axis of a sheet and the values it selects. Typed by the sheet's
 * axes; an axis only TypeScript knows (no rule selects it and it has no
 * default) has no runtime representation, so every key is optional.
 */
export type StylesheetVariants<T = object> = [ModsOf<T>] extends [never]
  ? Readonly<Record<string, readonly (string | boolean)[]>>
  : {
      readonly [K in keyof ModsOf<T> & string]?: readonly SelectorValue<
        ModsOf<T>[K]
      >[]
    }

/** One combination of a sheet's variant values; an axis left out is unset. */
export type VariantCombination<T = object> = [ModsOf<T>] extends [never]
  ? Readonly<Record<string, string | boolean>>
  : {
      readonly [K in keyof ModsOf<T> & string]?: SelectorValue<ModsOf<T>[K]>
    }

export interface VariantCombinationOptions {
  /** Refuse a sheet with more combinations than this. Default 512. */
  readonly cap?: number
  /** How the error names the sheet. Default: its parts. */
  readonly name?: string
}

type Tree = Record<string, unknown>
const isTree = (value: unknown): value is Tree => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const vocabularies = new WeakMap<object, StylesheetVariants>()

/**
 * Every variant axis of `sheet` with its values, in the order its selectors
 * first name them (one selector's own values are sorted):
 * `{ tone: ['quiet', 'loud'], size: ['s', 'm'] }`. It reads every way a sheet
 * declares a variant: `.variants()` (chained or not), selectors in an
 * `.extend()` layer, selector keys written inside a part or a condition, and
 * the declared defaults. A boolean axis is `[false, true]`, whichever value
 * its rules select. A selector key that a later layer removes with `null`
 * does not count.
 */
export function stylesheetVariants<T extends object>(
  sheet: T,
): StylesheetVariants<T> {
  const cached = vocabularies.get(sheet)
  if (cached) return cached as StylesheetVariants<T>
  const { rules } = getStylesheetPlan(sheet)
  const values = new Map<string, Set<string>>()
  const add = (axis: string, value?: string) => {
    let known = values.get(axis)
    if (!known) values.set(axis, (known = new Set()))
    if (value !== undefined) known.add(value)
  }
  const visit = (node: Tree) => {
    for (const [key, child] of Object.entries(node)) {
      if (key[0] === '[')
        for (const [axis, selected] of parseVariantSelector(key))
          if (axis === '$NONE$') continue
          else if (!selected.length) add(axis)
          else for (const value of selected) add(axis, value)
      if (isTree(child)) visit(child)
    }
  }
  for (const layer of declarationLayers(rules as Tree)) visit(layer)
  const defaults = (sheet as Record<symbol, Tree | undefined>)[SYMBOL_DEFAULTS]
  for (const [axis, value] of Object.entries(defaults ?? {}))
    add(axis, String(value))

  const vocabulary = Object.freeze(
    Object.fromEntries(
      [...values].map(([axis, set]) => {
        const list = [...set]
        const boolean =
          list.length > 0 &&
          list.every((value) => value === 'true' || value === 'false')
        return [axis, Object.freeze(boolean ? [false, true] : list)]
      }),
    ),
  )
  vocabularies.set(sheet, vocabulary)
  return vocabulary as StylesheetVariants<T>
}

/**
 * Every combination of `sheet`'s variant values, each axis also left unset
 * (its default, or the base rules): for axes of 2 and 1 values, 3 × 2 = 6
 * combinations, starting with `{}`. Throws, naming the sheet, when there would
 * be more than `cap` (default 512), so a sheet that grows its axes is noticed
 * rather than enumerated slowly.
 */
export function stylesheetVariantCombinations<T extends object>(
  sheet: T,
  options: VariantCombinationOptions = {},
): readonly VariantCombination<T>[] {
  const { cap = 512 } = options
  const axes = Object.entries(
    stylesheetVariants(sheet) as Readonly<
      Record<string, readonly (string | boolean)[]>
    >,
  )
  const total = axes.reduce(
    (count, [, values]) => count * (values.length + 1),
    1,
  )
  if (total > cap) {
    const name =
      options.name ??
      `the stylesheet with parts ${getStylesheetPlan(sheet).parts.join(', ')}`
    const sizes = axes
      .map(([axis, values]) => `${axis}: ${values.length + 1}`)
      .join(', ')
    throw new Error(
      `Toned: ${name} has ${total} variant combinations, more than the cap of ${cap} (${sizes}). Pass a larger cap, or enumerate fewer axes.`,
    )
  }
  let all: Record<string, string | boolean>[] = [{}]
  for (const [axis, values] of axes)
    all = all.flatMap((combination) => [
      combination,
      ...values.map((value) => ({ ...combination, [axis]: value })),
    ])
  return Object.freeze(
    all.map((combination) => Object.freeze(combination)),
  ) as readonly VariantCombination<T>[]
}
