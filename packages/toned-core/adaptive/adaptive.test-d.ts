import { expectTypeOf } from 'vitest'
import { defineSystem } from '../system/definers.ts'
import type { Variants } from '../types/stylesheet.ts'
import {
  type AdaptiveLayoutAreas,
  type AdaptiveLayoutName,
  createAdaptiveStore,
  defineAdaptiveLayout,
} from './index.ts'

const layout = defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['Body', 'Actions'],
  fallback: 'stack',
  layouts: {
    stack: { flow: 'stack' },
    wide: {
      flow: 'row',
      areas: { Body: { grow: 1 } },
      when: { minWidth: 600 },
    },
  },
})
expectTypeOf<AdaptiveLayoutName<typeof layout>>().toEqualTypeOf<
  'stack' | 'wide'
>()
expectTypeOf<AdaptiveLayoutAreas<typeof layout>>().toEqualTypeOf<
  'Body' | 'Actions'
>()
expectTypeOf(layout.variants('wide')).toEqualTypeOf<
  Readonly<{ layout: 'stack' | 'wide' }>
>()
const store = createAdaptiveStore(layout)
store.update({ content: { Body: { width: 100, height: 20 } } })
// @ts-expect-error unknown measurement area
store.update({ content: { Unknown: { width: 1, height: 1 } } })
// @ts-expect-error finite candidate vocabulary
layout.variants('other')
// @ts-expect-error selector must provide the declared axis
layout.rules({ other: (value: 'stack' | 'wide') => value })
// @ts-expect-error selector must accept every declared layout
layout.rules({ layout: (value: 'stack') => value })

const ui = defineSystem({ id: 'adaptive-types', tokens: {} })
ui.stylesheet({ Root: {}, Body: {}, Actions: {} }).variants(
  ($: Variants<{ layout: AdaptiveLayoutName<typeof layout> }>) =>
    layout.rules($),
)
// Type-safe named parts integrate with the ordinary variant body validation.
ui.stylesheet({ Root: {}, Body: {}, Actions: {} }).variants(
  // @ts-expect-error rules refer to layout values absent from the declared axis
  ($: Variants<{ layout: 'other' }>) => layout.rules($),
)

defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['Body'],
  // @ts-expect-error fallback must name a declared candidate
  fallback: 'unknown',
  layouts: { stack: { flow: 'stack' } },
})
defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['Body'],
  fallback: 'stack',
  layouts: {
    // @ts-expect-error unknown named area
    stack: { flow: 'stack', areas: { Unknown: { grow: 1 } } },
  },
})
defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['Body'],
  fallback: 'stack',
  layouts: {
    // @ts-expect-error changing reading order is not portable adaptive layout
    stack: { flow: 'stack', areas: { Body: { order: 1 } } },
  },
})
defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['Body'],
  fallback: 'stack',
  layouts: {
    stack: { flow: 'stack' },
    // @ts-expect-error conditions are a finite vocabulary
    wide: { flow: 'row', when: { minimumWidth: 1 } },
  },
})
ui.stylesheet({ Root: {}, Body: {} }).variants(
  // @ts-expect-error adaptive rules require the Actions part to exist
  ($: Variants<{ layout: AdaptiveLayoutName<typeof layout> }>) =>
    layout.rules($),
)
