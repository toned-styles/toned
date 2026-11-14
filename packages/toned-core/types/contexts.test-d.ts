/**
 * Compile-time contracts for context markers: `$context` names a declared
 * context (or a context and value), a `'@within …'` key a declared context,
 * value or offered state, and anything else is a `TonedError` naming the
 * fix. In a system targeting native, a context STATE is web-only.
 * `tsc` is the test; every `Has<…>` below must be `true`.
 */
import { defineSystem, defineToken } from '../system/index.ts'
import type { TonedError } from './errors.ts'
import type { Variants } from './index.ts'
import type { StylesheetValidation } from './stylesheet.ts'

const gap = defineToken({
  values: [0, 1, 2] as const,
  resolve: (value) => ({ gap: value * 4 }),
})

const ui = defineSystem({
  id: 'ctx',
  tokens: { gap },
  conditions: {
    media: { md: 768 },
    states: { open: "[data-state='open']" },
    contexts: {
      card: { states: ['hover', 'open'] },
      prose: { values: ['faq', 'callout'] },
    },
  },
})

const portable = defineSystem({
  id: 'portable',
  targets: ['web', 'native'],
  tokens: { gap },
  conditions: { contexts: { card: { states: ['hover'] } } },
})

type S = (typeof ui)['system']
type Rules<T> = StylesheetValidation<S, T>
type MessageOf<E> = E extends TonedError<infer M> ? M : never
type Has<E, Pattern extends string> = [MessageOf<E>] extends [never]
  ? false
  : MessageOf<E> extends Pattern
    ? true
    : false

// --- declared markers and keys are accepted -----------------------------------

ui.stylesheet({ Root: { $context: 'card' } })
ui.stylesheet({ Root: { $context: ['card', 'prose=faq'] } })
ui.stylesheet({ Root: {} }).variants(
  ($: Variants<{ kind: 'faq' | 'callout' }>) => ({
    [$.kind('faq')]: { Root: { $context: 'prose=faq' } },
  }),
)
ui.stylesheet({
  Root: {
    '@within card': { gap: 1 },
    '@within card:hover': { gap: 2, '@md': { gap: 0 } },
    '@within prose=faq': { '@within card:open': { gap: 2 } },
    '@md': { '@within prose': { gap: 1 } },
  },
})
portable.stylesheet({
  Root: { '@platform web': { '@within card:hover': { gap: 1 } } },
})
portable.stylesheet({ Root: { '@within card': { gap: 1 } } })

// --- an undeclared context, value or state names the fix ----------------------

export const unknownContext: Has<
  Rules<{
    Root: { '@within crad:hover': { gap: 1 } }
  }>['Root']['@within crad:hover'],
  `Unknown context 'crad' in '@within crad:hover'. Declared contexts: ${string}'card'${string}`
> = true
ui.stylesheet({
  // @ts-expect-error — 'crad' is not a declared context
  Root: { '@within crad:hover': { gap: 1 } },
})

export const unknownValue: Has<
  Rules<{
    Root: { '@within prose=article': { gap: 1 } }
  }>['Root']['@within prose=article'],
  `Context 'prose' has no value 'article' in '@within prose=article'. Its values: ${string}. Declare it: contexts: { prose: { values: [${string}'article'${string}] } }`
> = true
ui.stylesheet({
  // @ts-expect-error — prose has no value 'article'
  Root: { '@within prose=article': { gap: 1 } },
})

export const stateNotOffered: Has<
  Rules<{
    Root: { '@within card:focus': { gap: 1 } }
  }>['Root']['@within card:focus'],
  `Context 'card' does not offer state 'focus' in '@within card:focus'. Declare it: contexts: { card: { states: [${string}'focus'${string}] } }`
> = true
ui.stylesheet({
  // @ts-expect-error — card does not offer focus
  Root: { '@within card:focus': { gap: 1 } },
})

export const unknownMarker: Has<
  Rules<{ Root: { $context: 'crad' } }>['Root']['$context'],
  `Unknown context 'crad' in $context. Declared contexts: ${string}`
> = true
// @ts-expect-error — 'crad' is not a declared context
ui.stylesheet({ Root: { $context: 'crad' } })

export const unknownMarkerValue: Has<
  Rules<{ Root: { $context: 'prose=fq' } }>['Root']['$context'],
  `Context 'prose' has no value 'fq' in $context. Its values: ${string}`
> = true
// @ts-expect-error — prose has no value 'fq'
ui.stylesheet({ Root: { $context: 'prose=fq' } })

ui.stylesheet({
  // @ts-expect-error — a marker is static: not inside a condition
  Root: { ':hover': { $context: 'card' } },
})

// A token typo inside a context block is still a token typo.
ui.stylesheet({
  // @ts-expect-error — 'gapp' is not a token
  Root: { '@within card:hover': { gapp: 1 } },
})

// --- native: a context state is web-only --------------------------------------

export const nativeState: Has<
  StylesheetValidation<
    (typeof portable)['system'],
    { Root: { '@within card:hover': { gap: 1 } } }
  >['Root']['@within card:hover'],
  `'@within card:hover' reads a provider state, and this system's 'native' target has no provider state across components: put it under '@platform web', or drop the native target`
> = true
portable.stylesheet({
  // @ts-expect-error — native has no provider state across components
  Root: { '@within card:hover': { gap: 1 } },
})
