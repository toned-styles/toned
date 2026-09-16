/**
 * Themeable palettes: a token's value ACROSS themes, declared as a pair.
 *
 * A theme is a named set of token values (light/dark, or any other). Rather than
 * one flat map per theme — which scatters a token's two values across two objects
 * — a palette is keyed on the TOKEN, each value a per-theme map, so a token's
 * light and dark sit side by side and read as one unit ("the token set comes in
 * pairs"). `generatePalette` (dom) transposes it into the scoped CSS custom-
 * property blocks; a literal provider transposes the other way (one theme, every
 * token's value) for platforms without CSS variables.
 *
 * Token DEFINITIONS (`defineToken`) are unchanged and stay theme-agnostic: they
 * emit `var(--<name>)` references, and a palette supplies what those references
 * resolve to per theme.
 *
 * @module system/palette
 */

import { immutableSnapshot } from '../utils/immutable.ts'

/** A token's value: a bare string is theme-INVARIANT; a map is per-theme. */
export type ThemeValue = string | Record<string, string>

/** Per-theme metadata: which is the default, and its `prefers-color-scheme`. */
export interface ThemeMeta {
  /** Exactly one theme must set this; its values land on `:root`. */
  default?: boolean
  /** Maps the theme to a media query for automatic (OS-preference) switching. */
  colorScheme?: 'light' | 'dark'
}

export interface PaletteConfig {
  /** Explicit source for omitted theme values; otherwise every map must be complete. */
  fallbackTheme?: string
  /** The themes this palette spans, keyed by name (the value-map keys). */
  themes: Record<string, ThemeMeta>
}

export interface Palette {
  /** Token name (the `--<name>` custom property) → its value across themes. */
  tokens: Record<string, ThemeValue>
  themes: Record<string, ThemeMeta>
  /** The name of the single theme flagged `default: true`. */
  defaultTheme: string
  fallbackTheme?: string
}

/**
 * Declare a themeable palette. Validates at import (a constructor, not an
 * annotation — see the CLAUDE.md doctrine): exactly one default theme, and every
 * per-theme key names a declared theme.
 *
 * @param tokens token name → value (bare string = invariant, or a per-theme map)
 * @param config the themes this palette spans
 */
export function definePalette(
  tokens: Record<string, ThemeValue>,
  config: PaletteConfig,
): Palette {
  const themeNames = Object.keys(config.themes)
  if (themeNames.length === 0)
    throw new Error('definePalette: at least one theme must be declared')

  const defaults = themeNames.filter((t) => config.themes[t]?.default)
  if (defaults.length !== 1)
    throw new Error(
      `definePalette: exactly one theme must be { default: true } (got ${defaults.length}: ${defaults.join(', ') || 'none'})`,
    )

  if (
    config.fallbackTheme !== undefined &&
    !themeNames.includes(config.fallbackTheme)
  )
    throw new Error(
      `definePalette: fallback theme '${config.fallbackTheme}' is not declared`,
    )

  for (const [name, value] of Object.entries(tokens)) {
    if (
      typeof value !== 'string' &&
      (!value || typeof value !== 'object' || Array.isArray(value))
    )
      throw new Error(
        `definePalette: token '${name}' must be a string or theme map`,
      )
    if (value && typeof value === 'object') {
      for (const theme of Object.keys(value)) {
        if (!(theme in config.themes))
          throw new Error(
            `definePalette: token '${name}' names theme '${theme}', which is not declared in \`themes\``,
          )
      }
      for (const theme of themeNames) {
        const resolved =
          value[theme] ??
          (config.fallbackTheme ? value[config.fallbackTheme] : undefined)
        if (typeof resolved !== 'string')
          throw new Error(
            `definePalette: token '${name}' has no value for theme '${theme}'; provide it or declare a fallbackTheme with a value`,
          )
      }
    }
  }

  return immutableSnapshot({
    tokens,
    themes: config.themes,
    defaultTheme: defaults[0]!,
    ...(config.fallbackTheme ? { fallbackTheme: config.fallbackTheme } : {}),
  })
}
