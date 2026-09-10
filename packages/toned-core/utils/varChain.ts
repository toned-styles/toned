/**
 * CSS custom property fallback chains.
 *
 * @module utils/varChain
 */

import { camelToKebab, withCssUnit } from './css.ts'

/** One conditional override in a chain. */
export type VarChainLink = {
  /**
   * Name of the space-toggle custom property, without the leading `--`, e.g.
   * `media-md` or `toned_hover`. Also namespaces the value it guards.
   */
  prefix: string
  /** Resolved CSS value to apply while the toggle is on. */
  value: unknown
  /**
   * Extra namespace for a second value on the same toggle and property, so the
   * two get distinct custom properties instead of overwriting each other.
   * `'__style'` marks a raw `style` escape hatch.
   */
  suffix?: string
}

/**
 * Write the custom properties for `links` and return the `var()` chain that
 * reads them.
 *
 * Each link declares `--<prefix>__<css-prop>: var(--<prefix>) <value>`. The
 * toggle `--<prefix>` is either `initial` (invalid, so the whole declaration
 * fails and the property falls through) or empty (valid, so the value applies).
 * Reading them back as nested fallbacks turns that into a priority cascade:
 *
 * ```css
 * padding: var(--media-md__padding, var(--media-sm__padding, 4px));
 * ```
 *
 * `links` are ordered lowest to highest priority — the last one ends up
 * outermost and therefore wins. The toggles themselves are emitted by
 * `dom/generate.ts`.
 *
 * Values become CSS text here, which is the point at which a bare number has to
 * pick up its `px` — see {@link withCssUnit}. Nothing downstream can do it: once
 * a property holds a `var()` chain it is a string, so the numeric check in
 * `applyStyles` (and React's equivalent for the `style` prop) no longer fires,
 * and an unsuffixed `8` inside the chain is an invalid length that takes the
 * whole declaration down with it.
 *
 * @param style - Style accumulator; custom properties are written onto it.
 * @param cssProp - camelCase CSS property the chain resolves to.
 * @param base - Unconditional value, or nullish when the property has none.
 * @returns The chain, or `null` when no link contributed — in which case
 *   `style` is untouched and the caller should leave `base` exactly as it is,
 *   rather than replace a number with its string form.
 */
export function writeVarChain(
  style: Record<string, unknown>,
  cssProp: string,
  base: unknown,
  links: readonly VarChainLink[],
): string | null {
  const kebabProp = camelToKebab(cssProp)

  // Built lazily so that a link list where every entry is skipped writes
  // nothing at all, rather than an identity chain around the base.
  let chain: string | null = null

  for (const { prefix, value, suffix = '' } of links) {
    // An empty value would substitute to nothing, making the declaration
    // invalid rather than empty, so the toggle cannot express it. `0` and
    // other falsy values are fine and must still be emitted.
    if (value == null || value === '') continue

    const varName = `--${prefix}__${kebabProp}${suffix}`
    style[varName] = `var(--${prefix}) ${withCssUnit(cssProp, value)}`

    // Annotated because `chain` is assigned from this, and inference would
    // otherwise chase its own tail. Empty is normalised to null above, so the
    // truthiness check below cannot misread a real value.
    const fallback: string | null =
      chain ??
      (base == null || base === '' ? null : `${withCssUnit(cssProp, base)}`)

    chain = fallback ? `var(${varName}, ${fallback})` : `var(${varName})`
  }

  return chain
}
