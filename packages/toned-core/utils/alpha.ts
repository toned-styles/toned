/**
 * The alpha modifier: `bgColor: 'primary/90'`.
 *
 * "Statically dynamic" by design — the system css stays static while alpha is
 * a runtime parameter:
 *
 * - Every alpha-capable colour rule routes through relative colour syntax:
 *   `background-color: rgb(from var(--primary) r g b / var(--toned-alpha-background-color, 1))`.
 *   One rule per token value, exactly as before — no token × alpha explosion.
 * - The parameter is registered `@property { inherits: false; initial-value: 1 }`:
 *   non-inheritance is load-bearing, or a parent's wash would cascade onto
 *   every descendant's colour.
 * - Enumerated steps become atomic classes (`.bgColor$50 { --toned-alpha-…: 0.5 }`);
 *   an off-scale alpha is one inline custom property — a parameter, so it never
 *   fights a caller's className for the painted property.
 * - Where tokens resolve to LITERALS (react-native, email), `alphaLiteral`
 *   computes the rgba directly — same stylesheet, both platforms.
 *
 * Mixing with `transparent` under premultiplied interpolation is pure alpha
 * scaling, so RCS output is identical to Tailwind's
 * `color-mix(in oklab, C N%, transparent)` — migrations stay pixel-safe.
 *
 * @module utils/alpha
 */

import { camelToKebab } from './css.ts'
import { warnOnce } from './warn.ts'

/** The steps that get a static atomic class. Off-scale values still work — they
 * resolve to one inline custom property instead of a class. */
export const DEFAULT_ALPHA_STEPS: readonly number[] = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
]

/** The CSS custom property carrying the alpha parameter for one CSS property. */
export const alphaVarName = (cssProp: string): string =>
  `--toned-alpha-${camelToKebab(cssProp)}`

export interface AlphaValue {
  base: string
  /** Percentage, 0–100 exclusive of the ends (100 is just the base value). */
  alpha: number
}

/**
 * Parse `'primary/90'` → `{ base: 'primary', alpha: 90 }`.
 * Returns null for anything that is not a well-formed alpha value, so callers
 * can fall through to normal resolution without guessing.
 */
export function splitAlphaValue(value: unknown): AlphaValue | null {
  if (typeof value !== 'string') return null
  const idx = value.lastIndexOf('/')
  if (idx <= 0 || idx === value.length - 1) return null
  const alpha = Number(value.slice(idx + 1))
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 100) return null
  return { base: value.slice(0, idx), alpha }
}

const UNWRAPPABLE = new Set([
  'transparent',
  'currentcolor',
  'inherit',
  'initial',
  'unset',
  'none',
])

/** Whether a resolved colour value can carry the alpha parameter. */
export const alphaWrappable = (value: unknown): value is string =>
  typeof value === 'string' && !UNWRAPPABLE.has(value.toLowerCase())

/**
 * Route a colour value through relative colour syntax with the given alpha
 * expression (a literal like `0.9`, or `var(--toned-alpha-…, 1)`).
 *
 * `calc(alpha * …)` — MULTIPLYING the source's own alpha channel — is
 * load-bearing: a bare `/ expr` REPLACES it, which silently turns a
 * translucent token opaque (measured: every `--border: rgb(20 20 28 / 0.08)`
 * hairline rendered solid, 39 of 109 showcase slugs shifted). Multiplication
 * also matches color-mix-with-transparent semantics, which compose alphas.
 */
export const withAlphaExpr = (colorValue: string, alphaExpr: string): string =>
  `rgb(from ${colorValue} r g b / calc(alpha * ${alphaExpr}))`

/**
 * Compute a literal rgba for platforms without CSS (react-native, email).
 * Handles #rgb/#rgba/#rrggbb/#rrggbbaa and rgb()/rgba(); anything else falls
 * back to the RCS string with a dev warning (native cannot evaluate it).
 */
export function alphaLiteral(colorValue: string, alpha01: number): string {
  const hex = colorValue.trim()
  if (hex[0] === '#') {
    const body = hex.slice(1)
    const long =
      body.length === 3 || body.length === 4
        ? [...body].map((c) => c + c).join('')
        : body
    if (long.length === 6 || long.length === 8) {
      const r = Number.parseInt(long.slice(0, 2), 16)
      const g = Number.parseInt(long.slice(2, 4), 16)
      const b = Number.parseInt(long.slice(4, 6), 16)
      const baseA =
        long.length === 8 ? Number.parseInt(long.slice(6, 8), 16) / 255 : 1
      if ([r, g, b, baseA].every(Number.isFinite)) {
        return `rgba(${r}, ${g}, ${b}, ${round3(baseA * alpha01)})`
      }
    }
  }
  const rgbMatch = hex.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i,
  )
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3]) {
    const baseA = rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4])
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${round3(baseA * alpha01)})`
  }
  warnOnce(
    `alpha-literal:${colorValue}`,
    `cannot compute a literal alpha for '${colorValue}' — only hex and rgb() literals are ` +
      'supported off-CSS. Falling back to relative colour syntax, which a native renderer ' +
      'will not understand.',
  )
  return withAlphaExpr(colorValue, String(alpha01))
}

const round3 = (n: number) => Math.round(n * 1000) / 1000

/**
 * Apply alpha to a RESOLVED colour value: `var()` references (and any other
 * CSS-side value) route through RCS; literals compute directly, which is what
 * keeps the same stylesheet meaningful where CSS does not exist.
 */
export function applyAlpha(colorValue: string, alpha01: number): string {
  if (colorValue.includes('var('))
    return withAlphaExpr(colorValue, String(alpha01))
  return alphaLiteral(colorValue, alpha01)
}
