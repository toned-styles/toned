/**
 * Compile-time contracts for CSS keyword values: in a web `$style`, a literal
 * string for a property whose values are a closed keyword set (`cursor`,
 * `display`, `alignItems`, …) must be one of its keywords, a CSS-wide keyword
 * or a function form (`var()`, `env()`, `url()`, …). csstype types those
 * properties as `string`, so without this check a typo is silent.
 * `tsc` is the test; every `Has<…>` below must be `true`.
 */
import { defineSystem, defineToken, type Variants } from '../index.ts'
import type { TonedError } from './errors.ts'
import type { StylesheetValidation } from './stylesheet.ts'

const gap = defineToken({
  values: [0, 1] as const,
  resolve: (value) => ({ gap: value * 4 }),
})

const ui = defineSystem({ id: 'keywords', tokens: { gap } })

type S = (typeof ui)['system']
type Rules<T> = StylesheetValidation<S, T>
type MessageOf<E> = E extends TonedError<infer M> ? M : never
type Has<E, Pattern extends string> = [MessageOf<E>] extends [never]
  ? false
  : MessageOf<E> extends Pattern
    ? true
    : false
type WebStyle<T> = Rules<{
  Root: { '@platform web': { $style: T } }
}>['Root']['@platform web']['$style']
type TextStyle<T> = Rules<{
  Label: { $kind: 'text'; '@platform web': { $style: T } }
}>['Label']['@platform web']['$style']

// --- a typo is a type error that names the keyword ------------------------------

export const cursor: Has<
  WebStyle<{ cursor: 'pointr' }>['cursor'],
  `'pointr' is not a 'cursor' keyword. Did you mean 'pointer'? Keywords: ${string}, or a CSS-wide keyword, var() or another function`
> = true
ui.stylesheet({
  // @ts-expect-error — 'pointr' is not a cursor keyword
  Root: { '@platform web': { $style: { cursor: 'pointr' } } },
})

export const display: Has<
  WebStyle<{ display: 'flx' }>['display'],
  `'flx' is not a 'display' keyword. Did you mean ${string}'flex'${string}?${string}`
> = true

// In a multi-keyword value, the message names the word that is wrong.
export const word: Has<
  WebStyle<{ display: 'inline flx' }>['display'],
  `'flx' in 'inline flx' is not a 'display' keyword.${string}`
> = true

export const alignment: Has<
  WebStyle<{ alignItems: 'centre' }>['alignItems'],
  `'centre' is not a 'alignItems' keyword. Did you mean 'center'?${string}`
> = true

export const weight: Has<
  TextStyle<{ fontWeight: 'bol' }>['fontWeight'],
  `'bol' is not a 'fontWeight' keyword. Did you mean ${string}'bold'${string}`
> = true

// The list is truncated; vendor-prefixed keywords and CSS-wide ones are left
// out of it.
export type CursorMessage = MessageOf<WebStyle<{ cursor: 'pointr' }>['cursor']>
export const truncated: CursorMessage extends `${string}, …, or a CSS-wide${string}`
  ? CursorMessage extends `${string}'-${string}`
    ? false
    : true
  : false = true

// Everywhere a web $style is written.
ui.stylesheet({
  Root: {
    ':hover': {
      // @ts-expect-error — inside a condition
      '@platform web': { $style: { cursor: 'pointr' } },
    },
  },
})
ui.stylesheet({
  Label: {
    $kind: 'text',
    // @ts-expect-error — in a $style list entry
    '@platform web': { $style: [{ textTransform: 'upercase' }] },
  },
})
const base = ui.stylesheet({ Root: {} })
// @ts-expect-error — in variant rules
base.variants(($: Variants<{ size: 's' | 'm' }>) => ({
  [$.size('s')]: {
    Root: { '@platform web': { $style: { cursor: 'pointr' } } },
  },
}))
const web = defineSystem({ id: 'web-only', targets: ['web'], tokens: { gap } })
web.stylesheet({
  // @ts-expect-error — a web-only system's top-level $style is web CSS
  Root: { $style: { justifyContent: 'space-betwen' } },
})

// --- valid values are accepted ---------------------------------------------------

ui.stylesheet({
  Root: {
    '@platform web': {
      $style: {
        cursor: 'pointer',
        display: 'inline flex',
        overflow: 'hidden auto',
        alignItems: 'safe center',
        alignSelf: 'first baseline',
        justifyContent: 'space-between',
        placeItems: 'center start',
        whiteSpace: 'nowrap',
        borderStyle: 'solid dashed',
        touchAction: 'pan-x pan-y',
        flexFlow: 'row wrap',
      },
    },
  },
  Label: {
    $kind: 'text',
    '@platform web': {
      $style: {
        fontStyle: 'oblique 10deg',
        textAlign: 'start',
        fontWeight: 600,
        textTransform: 'uppercase',
        textDecorationLine: 'underline line-through',
      },
    },
  },
})
// CSS-wide keywords, any case, and function forms.
ui.stylesheet({
  Root: {
    '@platform web': {
      $style: {
        cursor: 'url(hand.svg) 4 4, pointer',
        display: 'inherit',
        alignItems: 'var(--toned-align)',
        justifyContent: 'Center',
      },
    },
  },
  Label: { $kind: 'text', '@platform web': { $style: { fontWeight: '600' } } },
})
// Vendor display values csstype leaves out, which a line clamp needs.
ui.stylesheet({
  Root: { '@platform web': { $style: { display: '-webkit-box' } } },
  Label: {
    $kind: 'text',
    '@platform web': {
      $style: {
        display: '-webkit-inline-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        overflow: 'hidden',
      },
    },
  },
})
export const webkitBox: [
  MessageOf<WebStyle<{ display: '-webkit-box' }>['display']>,
] extends [never]
  ? true
  : false = true
// A value that is not a literal is not checked.
declare const dynamic: string
ui.stylesheet({
  Root: { '@platform web': { $style: { cursor: dynamic, display: dynamic } } },
})
// A union of literals is checked member by member.
declare const either: 'pointer' | 'default'
ui.stylesheet({ Root: { '@platform web': { $style: { cursor: either } } } })
declare const typo: 'pointer' | 'pointr'
ui.stylesheet({
  // @ts-expect-error — one member is a typo
  Root: { '@platform web': { $style: { cursor: typo } } },
})
// A custom counter style is a valid list-style-type, so it is not checked.
ui.stylesheet({
  Root: { '@platform web': { $style: { listStyleType: 'my-counter' } } },
})
