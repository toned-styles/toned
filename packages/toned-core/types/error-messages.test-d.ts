/**
 * Compile-time contracts for the TEXT of the errors a stylesheet's rejected
 * keys produce: each names what was wrong and what to write instead. `tsc` is
 * the test; every `Has<…>` below must be `true`.
 *
 * Each case reads the message a key's value is checked against
 * (`StylesheetValidation`), and the `@ts-expect-error` beside it pins that
 * the same mistake still fails to compile.
 */
import type { Variants } from '../index.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import type { TonedError } from './errors.ts'
import type { CheckedVariantRules, StylesheetValidation } from './stylesheet.ts'

const gap = defineToken({
  values: [0, 1, 2, 4] as const,
  resolve: (value) => ({ gap: value * 4 }),
})
const padding = defineToken({
  values: [0, 1, 2] as const,
  resolve: (value) => ({ padding: value * 4 }),
})

const ui = defineSystem({
  id: 'errors',
  tokens: { gap, padding },
  conditions: {
    media: { md: 768, lg: 1024 },
    states: { open: "[data-state='open']", busy: '[aria-busy=true]' },
  },
})

type S = (typeof ui)['system']
type Rules<T> = StylesheetValidation<S, T>
/** Either order: the compiler lists a union in its own order. */
type States = `':open', ':busy'` | `':busy', ':open'`
type Media = `'@md', '@lg'` | `'@lg', '@md'`
type MessageOf<E> = E extends TonedError<infer M> ? M : never
/** `true` when the message at that position matches `Pattern`. */
type Has<E, Pattern extends string> = [MessageOf<E>] extends [never]
  ? false
  : MessageOf<E> extends Pattern
    ? true
    : false

// --- unknown token key ---------------------------------------------------------

export const token: Has<
  Rules<{ Root: { gapp: 1 } }>['Root']['gapp'],
  `Unknown token 'gapp'. Did you mean 'gap'? Tokens: ${`'gap', 'padding'` | `'padding', 'gap'`}`
> = true
// @ts-expect-error — gapp is not a token
ui.stylesheet({ Root: { gapp: 1 } })

export const tokenNothingClose: Has<
  Rules<{ Root: { zz: 1 } }>['Root']['zz'],
  `Unknown token 'zz'. Tokens: ${`'gap', 'padding'` | `'padding', 'gap'`}`
> = true

// A CSS property written as a token names $style (and '@platform web').
export const cssAsToken: Has<
  Rules<{ Root: { opacity: 1 } }>['Root']['opacity'],
  `'opacity' is a CSS property, not a token: write $style: { opacity: … }`
> = true
export const webCssAsToken: Has<
  Rules<{ Root: { cursor: 'pointer' } }>['Root']['cursor'],
  `'cursor' is a web-only CSS property, not a token: write '@platform web': { $style: { cursor: … } }`
> = true

// --- CSS property typo in a web block -------------------------------------------

type WebBlock = Rules<{
  Root: { '@platform web': { $style: { backgroundColour: 'red' } } }
}>['Root']['@platform web']['$style']['backgroundColour']
export const cssTypo: Has<
  WebBlock,
  `Unknown CSS property 'backgroundColour'. Did you mean 'backgroundColor'?`
> = true
ui.stylesheet({
  // @ts-expect-error — backgroundColour is not a CSS property
  Root: { '@platform web': { $style: { backgroundColour: 'red' } } },
})

// --- web-only value in portable $style ------------------------------------------

export const webOnly: Has<
  Rules<{
    Root: { $style: { cursor: 'pointer' } }
  }>['Root']['$style']['cursor'],
  `'cursor' is web-only: put it under '@platform web': { $style: { cursor: … } }, or use a token`
> = true
ui.stylesheet({
  // @ts-expect-error — cursor is web-only
  Root: { $style: { cursor: 'pointer' } },
})
// …and a CSS variable is web-only too.
ui.stylesheet({
  // @ts-expect-error — CSS variables are web-only
  Root: { $style: { '--brand': 'red' } },
})
// The portable vocabulary itself is unchanged.
ui.stylesheet({ Root: { $style: { opacity: 0.5 } } })

// --- unknown state, compound state, raw selector --------------------------------

export const state: Has<
  Rules<{ Root: { gap: 1; ':opne': { gap: 2 } } }>['Root'][':opne'],
  `Unknown state ':opne'. Did you mean ':open'? Declared states: ${States}; built-in: ${string}':hover'${string}`
> = true
// @ts-expect-error — ':opne' is not a state
ui.stylesheet({ Root: { gap: 1, ':opne': { gap: 2 } } })

export const compound: Has<
  Rules<{ Root: { ':open:hovr': { gap: 2 } } }>['Root'][':open:hovr'],
  `Unknown state ':hovr' in ':open:hovr'. Did you mean ':hover'?${string}`
> = true

export const rawSelector: Has<
  Rules<{
    Root: { "[data-state='open']": { gap: 2 } }
  }>['Root']["[data-state='open']"],
  `'[data-state='open']' is a raw selector, not a key: it is the declared state ':open', so write ':open'`
> = true
// @ts-expect-error — a raw selector is not a key
ui.stylesheet({ Root: { gap: 1, "[data-state='open']": { gap: 2 } } })

export const rawSelectorUndeclared: Has<
  Rules<{ Root: { '[data-x]': { gap: 2 } } }>['Root']['[data-x]'],
  `'[data-x]' is a raw selector, not a key: declare it in conditions.states and write ':<name>'. Declared states: ${States}`
> = true

// --- unknown media and condition atoms ------------------------------------------

export const media: Has<
  Rules<{ Root: { '@mdd': { gap: 2 } } }>['Root']['@mdd'],
  `Unknown condition '@mdd'. Did you mean '@md'? Declared media: ${Media}; or a width such as '@>=768px'`
> = true
// @ts-expect-error — '@mdd' is not a declared media name
ui.stylesheet({ Root: { gap: 1, '@mdd': { gap: 2 } } })

export const atom: Has<
  Rules<{ Root: { '@md&!xx': { gap: 2 } } }>['Root']['@md&!xx'],
  `Unknown condition 'xx' in '@md&!xx'. Declared media: ${Media}; or a width such as '@>=768px'`
> = true
// @ts-expect-error — 'xx' is not a declared condition
ui.stylesheet({ Root: { gap: 1, '@md&!xx': { gap: 2 } } })
// Declared atoms and fixed widths combine freely.
ui.stylesheet({
  Root: { gap: 1, '@md&!lg': { gap: 2 }, '@>=400px|lg': { gap: 4 } },
})

export const platform: Has<
  Rules<{ Root: { '@platform ios': { gap: 2 } } }>['Root']['@platform ios'],
  `Unknown platform block '@platform ios': write '@platform web' or '@platform native'`
> = true

// --- unknown part in a source-channel / cross-part key --------------------------

export const part: Has<
  Rules<{ Root: { gap: 1 }; 'Nope:hover': { Root: { gap: 2 } } }>['Nope:hover'],
  `Unknown part 'Nope' in 'Nope:hover'. Declared parts: 'Root'`
> = true
// @ts-expect-error — Nope is not a part
ui.stylesheet({ Root: { gap: 1 }, 'Nope:hover': { Root: { gap: 2 } } })

export const crossState: Has<
  Rules<{ Root: { gap: 1 }; 'Root:opne': { Root: { gap: 2 } } }>['Root:opne'],
  `Unknown state ':opne' in 'Root:opne'. Did you mean ':open'?${string}`
> = true

export const partInCondition: Has<
  Rules<{ Root: { gap: 1 }; '@md': { Roof: { gap: 2 } } }>['@md']['Roof'],
  `Unknown part 'Roof'. Did you mean 'Root'? Declared parts: 'Root'`
> = true

// --- a condition inside $style --------------------------------------------------

export const conditionInStyle: Has<
  Rules<{
    Root: { $style: { ':hover': { opacity: 1 } } }
  }>['Root']['$style'][':hover'],
  `':hover' is a condition and cannot go inside $style: write it beside $style, as { ':hover': { $style: { … } } }`
> = true

// --- unknown variant key --------------------------------------------------------

type Axes = { size: 's' | 'm' }
type VariantKeyMessage = MessageOf<
  CheckedVariantRules<
    S,
    'Root',
    { wat: { Root: { gap: 1 } } },
    { Root: undefined },
    Axes
  >['wat']
>
export const variantKey: VariantKeyMessage extends `'wat' is not a variant selector of the declared axes, a part, a condition or a named fragment: write it as [$.<axis>(value)]. Axes: 'size'; parts: 'Root'`
  ? true
  : false = true
// The call still fails, but TypeScript reports its LAST overload (the legacy
// object form), so this text is not in that diagnostic yet.
// @ts-expect-error — wat is not a variant key
ui.stylesheet({ Root: { gap: 1 } }).variants((_$: Variants<Axes>) => ({
  wat: { Root: { gap: 2 } },
}))
