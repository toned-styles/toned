/**
 * Emit a system's declared themes as CSS custom properties.
 *
 * On the web a token's resolver reads `theme.field` as `var(--field)`, which
 * the build namespaces to `--<system id>-field`. This writes the other half:
 * the value of each field, per theme. The default theme lands on `:root` (or
 * the build scope), and every theme, the default included, under
 * `[data-theme='<name>']`, so any theme can be selected for a subtree, even
 * inside another theme's.
 *
 * Only top-level string and number fields are written: a nested group cannot
 * be read through one CSS variable, so its values reach a renderer through
 * explicit `tokens` instead.
 *
 * @module dom/themes
 */

import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'

export interface GenerateThemesOptions {
  /** The theme applied without a `data-theme` attribute. Defaults to the first declared. */
  default?: string
  /** The build's scope selector; themes then apply inside it instead of on `:root`. */
  scope?: string
}

const identifier = /^[a-zA-Z_][\w-]*$/

/** A value may not end its declaration or open a block, outside a quoted string. */
const unsafe = (value: string) =>
  /[;{}]/.test(value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, ''))

export function generateThemes<S extends TokenStyleDeclaration>(
  system: Pick<TokenSystem<S>, 'id' | 'themes'>,
  options: GenerateThemesOptions = {},
): string {
  const themes = system.themes ?? {}
  const names = Object.keys(themes)
  if (!names.length) return ''
  const fallback = options.default ?? names[0]
  if (fallback === undefined || !(fallback in themes))
    throw new Error(
      `Toned build: default theme '${fallback}' is not declared (declared: ${names.join(', ')})`,
    )
  const prefix = system.id ? `--${system.id}-` : '--'

  const block = (name: string): string => {
    if (!identifier.test(name))
      throw new Error(
        `Toned build: theme name '${name}' cannot be used in a selector`,
      )
    const declarations: string[] = []
    for (const [field, value] of Object.entries(themes[name] ?? {})) {
      if (typeof value !== 'string' && typeof value !== 'number') continue
      if (!identifier.test(field))
        throw new Error(
          `Toned build: theme field '${field}' cannot name a CSS custom property`,
        )
      if (typeof value === 'number' ? !Number.isFinite(value) : unsafe(value))
        throw new Error(
          `Toned build: theme '${name}' field '${field}' cannot be written as a CSS value`,
        )
      declarations.push(`${prefix}${field}: ${value};`)
    }
    return `{ ${declarations.join(' ')} }`
  }

  const scope = options.scope
  const select = (name: string) => {
    const attribute = `[data-theme='${name}']`
    return scope ? `${scope}${attribute}, ${scope} ${attribute}` : attribute
  }
  return [
    `${scope ?? ':root'} ${block(fallback)}`,
    ...names.map((name) => `${select(name)} ${block(name)}`),
  ].join('\n')
}

/** Longhands a class writes one value to; a shorthand is expanded into these. */
const sided =
  /(border-(?:top|right|bottom|left)-(?:width|color|style)|(?:padding|margin)-(?:top|right|bottom|left)|(?:^|[;{])(?:top|right|bottom|left))\s*:\s*var\(--([\w-]+)\)/g

/** Space-separated components of a CSS value, ignoring spaces inside functions and quotes. */
const components = (value: string) =>
  value
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\([^()]*\)/g, '_')
    .trim()
    .split(/\s+/).length

/**
 * A class sets each side of a box separately, so `borderWidth: theme.rule`
 * becomes four declarations that all read the same variable. A theme value
 * with several components (`3px 0 0 0`) would make every one of them invalid,
 * and CSS cannot index into a variable. Refuse it at build time.
 */
export function assertThemeSides<S extends TokenStyleDeclaration>(
  css: string,
  system: Pick<TokenSystem<S>, 'id' | 'themes'>,
): void {
  const themes = system.themes ?? {}
  const prefix = system.id ? `${system.id}-` : ''
  const used = new Map<string, string>()
  for (const match of css.matchAll(sided)) {
    const variable = match[2] ?? ''
    if (!variable.startsWith(prefix)) continue
    const property = (match[1] ?? '').replace(/^[;{]/, '')
    const field = variable.slice(prefix.length)
    // Report the first side found, in declaration order.
    if (!used.has(field)) used.set(field, property)
  }
  for (const [name, theme] of Object.entries(themes))
    for (const [field, property] of used) {
      const value = (theme as Record<string, unknown>)[field]
      if (typeof value === 'string' && components(value) > 1)
        throw new Error(
          `Toned build: theme '${name}' field '${field}' is '${value}', but it is read by ${property}, which takes a single value. A class sets each side separately, so give the theme one field per side instead.`,
        )
    }
}
