// Re-export types from @toned/core
export type {
  Breakpoints,
  Config,
  ModType,
  Pseudo,
  Stylesheet,
  StylesheetInput,
  StylesheetType,
  TokenConfig,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
} from '@toned/core'

import { defineSystem } from '@toned/core'
import * as border from './border.ts'
import * as colour from './colour.ts'
import * as config from './config.ts'
import * as layout from './layout.ts'
import * as shadow from './shadow.ts'
import * as sizes from './sizes.ts'
import * as text from './text.ts'
import * as typo from './typo.ts'

export const { system, stylesheet, t } = defineSystem(
  {
    ...typo,
    ...text,
    ...border,
    ...colour,
    ...layout,
    ...shadow,
    ...sizes,

    // ...rules
  },
  config,
)

/*
 * The spacing resolver, exported so a token definition can go THROUGH it
 * rather than restating its arithmetic.
 *
 * `resolve` and `pseudoRules` both receive `tokens`, so a token that needs a
 * spacing step in a value it composes itself can ask for one. Writing
 * `calc(var(--base) * 2)` by hand instead hardcodes the custom-property
 * branch, and the whole reason tokens resolve through `tokens[...]` is that a
 * provider may supply literal values — which is how a system renders where
 * custom properties do not exist.
 */
export { SpaceUnit } from './unit.ts'
