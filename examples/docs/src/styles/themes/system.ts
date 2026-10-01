import { defineSystem } from '@toned/core'
import { themes } from './themes.ts'
import * as tokens from './tokens.ts'

/**
 * The showcase's own system. `themes` is checked against the schema the
 * tokens were written for: a theme that omits a field, or adds one no token
 * reads, does not compile.
 *
 * The build writes each declared theme as CSS custom properties: the first
 * on `:root`, and every one under `[data-theme='<name>']`. Generated classes
 * read those variables, so switching theme changes that one attribute.
 */
export const themeSystem = defineSystem({
  id: 'themes',
  tokens,
  conditions: { media: { md: 768, lg: 1080 } },
  themes,
})

export const { stylesheet } = themeSystem
