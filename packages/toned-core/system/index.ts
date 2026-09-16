/**
 * System definition and configuration.
 *
 * @module system
 */

export { alpha } from '../utils/alpha.ts'
export type { Condition, ContainerConditionBuilder } from './conditions.ts'
export { and, bp, cq, not, or } from './conditions.ts'
export { defineConfig, getConfig, setConfig } from './config.ts'
export type { TokenSystem } from './definers.ts'
export {
  defineAnimations,
  defineSystem,
  defineToken,
  defineUnit,
} from './definers.ts'
export type {
  Palette,
  PaletteConfig,
  ThemeMeta,
  ThemeValue,
} from './palette.ts'
export { definePalette } from './palette.ts'
export type { QueryBuilder, QueryPredicate } from './queries.ts'
export { createQueries } from './queries.ts'
export type {
  SystemTheme,
  ThemeContract,
  ThemeTokenFactory,
} from './theme-types.ts'
export { defineTokenFor } from './theme-types.ts'
