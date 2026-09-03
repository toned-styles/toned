/**
 * System definition and configuration.
 *
 * @module system
 */

export { defineConfig, getConfig, setConfig } from './config.ts'
export { definePalette } from './palette.ts'
export type {
  Palette,
  PaletteConfig,
  ThemeMeta,
  ThemeValue,
} from './palette.ts'
export type { TokenSystem } from './definers.ts'
export {
  defineAnimations,
  defineSystem,
  defineToken,
  defineUnit,
} from './definers.ts'
