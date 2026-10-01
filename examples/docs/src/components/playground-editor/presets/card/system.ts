// The configuration layer: the design system this example is written in.
// It is Toned's ready-made base vocabulary, re-exported from one module so
// `styles.ts` imports `stylesheet` from here and never names the package.
// To use a system of your own, declare it here with `defineSystem`.
export type { Variants } from '@toned/core'
export { stylesheet, system } from '@toned/systems/base'
