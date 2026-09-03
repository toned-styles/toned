/**
 * Tunes the `style` escape hatch to React's web vocabulary.
 *
 *   import type {} from '@toned/react/style-types.web'
 *
 * Type-only, side-effect-free at runtime: importing this module augments
 * `@toned/core/registry` so every stylesheet's `style:` key (and `t({ style })`)
 * typechecks as `React.CSSProperties`.
 */
import type { CSSProperties } from 'react'

declare module '@toned/core/registry' {
  interface TonedTypeRegistry {
    inlineStyle: CSSProperties
  }
}

export type WebInlineStyle = CSSProperties
