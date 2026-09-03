/**
 * Emit a {@link Palette} as scoped CSS custom-property blocks.
 *
 * Transposes the token-keyed pairs into per-theme blocks:
 * - the DEFAULT theme lands on `:root`;
 * - every other theme gets a MANUAL scope (`[data-theme='<t>'], .<t>`) that an
 *   explicit choice activates, and — when `media` is on — an AUTOMATIC scope
 *   under `@media (prefers-color-scheme: <scheme>)`, guarded so a manual choice
 *   (a `[data-theme]` attr, or the default theme's own class) always wins.
 *
 * A token missing a theme's key falls back to the default theme's value, so a
 * pair only names what actually differs.
 *
 * @module dom/palette
 */

import type { Palette } from '../system/palette.ts'

export interface GeneratePaletteOptions {
  /**
   * Emit `@media (prefers-color-scheme)` blocks for automatic (OS-preference)
   * switching. Off by default: the manual scopes alone reproduce a `.dark`-class
   * setup byte-for-byte; turning it on is the deliberate behaviour change.
   */
  media?: boolean
}

export function generatePalette(
  palette: Palette,
  { media = false }: GeneratePaletteOptions = {},
): string {
  const { tokens, themes, defaultTheme } = palette
  const names = Object.keys(tokens)

  const valueFor = (name: string, theme: string): string => {
    const v = tokens[name]!
    if (typeof v === 'string') return v
    return v[theme] ?? v[defaultTheme]!
  }

  const block = (theme: string): string =>
    names.map((name) => `--${name}: ${valueFor(name, theme)};`).join(' ')

  let css = `:root { ${block(defaultTheme)} }`

  for (const [name, meta] of Object.entries(themes)) {
    if (name === defaultTheme) continue

    // Manual: an explicit choice, either the attribute or the class.
    css += `\n[data-theme='${name}'], .${name} { ${block(name)} }`

    // Automatic: the OS preference, unless a manual choice is in effect. The
    // guards make a manual choice win — an explicit `[data-theme]` (any value)
    // or the default theme's own class (e.g. `.light`) disables this block,
    // revealing the manual scope or `:root`.
    if (media && meta.colorScheme) {
      css +=
        `\n@media (prefers-color-scheme: ${meta.colorScheme}) {` +
        ` :root:not([data-theme]):not(.${defaultTheme}) { ${block(name)} } }`
    }
  }

  return css
}
