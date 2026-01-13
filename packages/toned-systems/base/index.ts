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
import * as typo from './typo.ts'

export const { system, stylesheet, t } = defineSystem(
  {
    ...typo,
    ...border,
    ...colour,
    ...layout,
    ...shadow,
    ...sizes,

    // ...rules
  },
  config,
)
