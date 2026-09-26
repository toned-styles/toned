/**
 * System definition and configuration.
 *
 * @module system
 */

export { alpha } from '../utils/alpha.ts'
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
export type { QueryBuilder } from './queries.ts'
export type { QueryKey } from './query-key.ts'
export { createQueries } from './queries.ts'
export type {
  SystemTheme,
  ThemeContract,
  ThemeTokenFactory,
} from './theme-types.ts'
export { defineTokenFor } from './theme-types.ts'
