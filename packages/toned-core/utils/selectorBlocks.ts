/**
 * Nested selector-block flattening for inline token styles.
 *
 * `stylesheet()` accepts nested `'@bp'` and `':pseudo'` blocks and flattens them
 * in {@link StyleMatcher} before they reach `exec`. This module is the
 * equivalent step for `t()`, so nested blocks passed to it are not discarded.
 *
 * @module utils/selectorBlocks
 */

import { SYMBOL_STYLE } from './symbols.ts'

// oxlint-disable-next-line typescript/no-explicit-any -- token style values are dynamic
type AnyValue = any

function isBlock(value: unknown): value is Record<string, AnyValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Flatten nested `'@bp'` / `':pseudo'` blocks into the underscore-joined form
 * `exec` consumes.
 *
 * ```ts
 * { padding: 'small', '@md': { padding: 'large' } }
 * // -> { padding: 'small', '@md_padding': 'large' }
 * ```
 *
 * Flattening at merge time (rather than inside `exec`) is what makes repeated
 * arguments compose: `t({ '@md': { padding: 2 } }, { '@md': { gap: 1 } })` keeps
 * both properties, where merging the nested objects would drop the first.
 *
 * Only ever applied to caller-authored styles — a `t()` result is already flat,
 * so `t()` reads its stored style directly instead of running it through here
 * again. That keeps the rule a plain "selector key holding a block", with no
 * need to guess whether a key has been processed before.
 *
 * Returns the input unchanged when there is nothing to flatten, so the common
 * case allocates nothing. Never mutates the input.
 */
export function flattenSelectorBlocks<T extends object>(input: T): T {
  let out: Record<string, AnyValue> | undefined

  for (const key of Object.keys(input)) {
    if (key[0] !== '@' && key[0] !== ':') continue

    const value = (input as Record<string, AnyValue>)[key]
    if (!isBlock(value)) continue

    // A nested t() result keeps its tokens behind SYMBOL_STYLE; its own keys
    // are the computed style/className getters, not token properties.
    const block = (
      SYMBOL_STYLE in value ? value[SYMBOL_STYLE] : value
    ) as Record<string, AnyValue>

    // Copy lazily, and only once, on the first block we actually flatten.
    // Spread preserves symbol-keyed internals (SYMBOL_REF and friends).
    out ??= { ...(input as Record<string, AnyValue>) }
    delete out[key]

    for (const prop of Object.keys(block)) {
      out[`${key}_${prop}`] = block[prop]
    }
  }

  return (out ?? input) as T
}
