/**
 * Compile-time contracts for `$bridge`: its names are the system's declared
 * bridges and their declared properties, and anything else is a
 * `TonedError` listing the declared ones. A raw `--toned-b-*` key in `$style`
 * naming no declared bridge parameter is an error too, naming `$bridge`.
 * `tsc` is the test; every `Has<…>` below must be `true`.
 */
import { defineSystem, defineToken } from '../system/index.ts'
import type { TonedError } from './errors.ts'
import type { StylesheetValidation } from './stylesheet.ts'

const gap = defineToken({
  values: [0, 1] as const,
  resolve: (value) => ({ gap: value * 4 }),
})

const ui = defineSystem({
  id: 'bridged',
  tokens: { gap },
  conditions: {
    media: { md: 768 },
    states: { open: "[data-state='open']" },
    bridges: {
      placeholder: { selector: '::placeholder', properties: ['color'] },
      scrollbar: {
        selector: '::-webkit-scrollbar',
        properties: ['display', 'backgroundColor'],
      },
    },
  },
})

type S = (typeof ui)['system']
type Rules<T> = StylesheetValidation<S, T>
type MessageOf<E> = E extends TonedError<infer M> ? M : never
type Has<E, Pattern extends string> = [MessageOf<E>] extends [never]
  ? false
  : MessageOf<E> extends Pattern
    ? true
    : false

// --- declared names are accepted, in every place a $style is -------------------

ui.stylesheet({
  Root: {
    $bridge: { scrollbar: { display: 'none' } },
    ':open': { $bridge: { placeholder: { color: 'red' } } },
    '@md': { $bridge: { scrollbar: { backgroundColor: 'transparent' } } },
    '@platform web': {
      $style: { cursor: 'pointer' },
      $bridge: { scrollbar: { display: 'block' } },
    },
  },
})
ui.stylesheet((q) => ({
  Root: {
    [q.all(q.media('md'))]: { $bridge: { scrollbar: { display: 'none' } } },
  },
}))

// --- an unknown bridge or property names the declared ones ---------------------

export const unknownBridge: Has<
  Rules<{
    Root: { $bridge: { placeholdr: { color: 'red' } } }
  }>['Root']['$bridge']['placeholdr'],
  `Unknown bridge 'placeholdr'. Did you mean 'placeholder'? Declared bridges: ${`'placeholder', 'scrollbar'` | `'scrollbar', 'placeholder'`}`
> = true
ui.stylesheet({
  // @ts-expect-error — 'placeholdr' is not a declared bridge
  Root: { $bridge: { placeholdr: { color: 'red' } } },
})

export const unknownProperty: Has<
  Rules<{
    Root: { ':open': { $bridge: { scrollbar: { width: 0 } } } }
  }>['Root'][':open']['$bridge']['scrollbar']['width'],
  `Bridge 'scrollbar' has no property 'width'. Its properties: ${`'display', 'backgroundColor'` | `'backgroundColor', 'display'`}`
> = true
ui.stylesheet({
  // @ts-expect-error — the scrollbar bridge has no 'width'
  Root: { ':open': { $bridge: { scrollbar: { width: 0 } } } },
})

const plain = defineSystem({ id: 'plain', tokens: { gap } })
plain.stylesheet({
  // @ts-expect-error — this system declares no bridges
  Root: { $bridge: { placeholder: { color: 'red' } } },
})

// --- a raw bridge variable in $style must name a declared parameter -------------

export const rawMisspelt: Has<
  Rules<{
    Root: {
      '@platform web': { $style: { '--toned-b-placeholdr-color': 'red' } }
    }
  }>['Root']['@platform web']['$style']['--toned-b-placeholdr-color'],
  `'--toned-b-placeholdr-color' is not a parameter of a declared bridge. Did you mean '--toned-b-placeholder-color'? Write $bridge: { <bridge>: { <property>: value } } beside $style. Declared: ${string}'placeholder'${string}`
> = true
ui.stylesheet({
  Root: {
    // @ts-expect-error — no declared bridge has this parameter
    '@platform web': { $style: { '--toned-b-placeholdr-color': 'red' } },
  },
})
// A declared parameter still compiles (the lint rule asks for $bridge).
ui.stylesheet({
  Root: {
    '@platform web': {
      $style: { '--toned-b-scrollbar-background-color': 'red' },
    },
  },
})
