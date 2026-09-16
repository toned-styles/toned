import { defineSystem, defineTokenFor } from '../index.ts'

type Theme = { colors: { primary: string }; space: number }
const token = defineTokenFor<Theme>()
const color = token({
  values: ['primary'] as const,
  resolve: (value, theme) => ({ color: theme.colors[value] }),
})
const gap = token({
  values: [0, 1] as const,
  dynamic: 'number',
  resolve: (value, theme) => ({ gap: value * theme.space }),
})
token({
  values: ['primary'],
  resolve: (_value, theme) => {
    // @ts-expect-error resolver theme field names are checked
    return { color: theme.colours.primary }
  },
})
defineSystem({
  id: 'typed-theme',
  tokens: { color, gap },
  themes: {
    daylight: { colors: { primary: 'red' }, space: 4 },
  },
})
const missingTheme = {
  id: 'missing-theme',
  tokens: { color, gap },
  themes: { missing: { colors: { primary: 'blue' } } },
}
// @ts-expect-error every token's required schema is checked
defineSystem(missingTheme)
const second = defineTokenFor<{ radius: number }>()({
  values: ['round'],
  resolve: (_, theme) => ({ borderRadius: theme.radius }),
})
defineSystem({
  id: 'composed-theme',
  tokens: { color, second },
  themes: {
    complete: { colors: { primary: 'red' }, space: 4, radius: 2 },
  },
})
const missingComposed = {
  id: 'missing-composed',
  tokens: { color, second },
  themes: { missing: { colors: { primary: 'red' }, space: 4 } },
}
// @ts-expect-error composed libraries require the intersection of their schemas
defineSystem(missingComposed)
export const typedThemeSheet = defineSystem({
  id: 'typed-dynamic',
  tokens: { color, gap },
}).stylesheet({ Root: { gap: 2.5 } })
const bad = defineSystem({ id: 'typed-value', tokens: { color } }).stylesheet({
  // @ts-expect-error typed theme factory preserves finite token values
  Root: { color: 'missing' },
})
void bad

import { createNativeRenderer } from '../server/index.ts'

const rendererSystem = defineSystem({
  id: 'renderer-theme-schema',
  tokens: { color, gap },
})
const renderer = createNativeRenderer(rendererSystem, {
  tokens: { colors: { primary: 'red' }, space: 4 },
})
const rendererSheet = rendererSystem.stylesheet({ Root: { gap: 1 } })
// @ts-expect-error renderer construction requires the declared token theme schema
createNativeRenderer(rendererSystem, { tokens: { space: 4 } })
// @ts-expect-error per-resolution token inputs preserve the same schema
renderer.resolve(rendererSheet, { tokens: { space: 8 } })
// @ts-expect-error explanations resolve tokens and check the same schema
renderer.explain(rendererSheet, { tokens: { space: 8 } })
renderer.resolve(rendererSheet, {
  tokens: { colors: { primary: 'blue' }, space: 8 },
})

import { dp, percent, rgba, themeRef } from '../index.ts'
import type { NativeInlineStyle, WebInlineStyle } from '../types/style.ts'

const portable = defineTokenFor<{ ink: string; step: number }>()
const reference = themeRef<{ ink: string; step: number }>()
portable({
  values: [1],
  resolve: () => ({
    paddingInline: dp(12),
    width: percent(50),
    color: rgba(1, 2, 3),
    gap: reference('step'),
    backgroundColor: reference('ink'),
  }),
})
// @ts-expect-error exact inferred result keys reject a typo beside a valid field
portable({ values: [1], resolve: () => ({ gap: 1, typo: 2 }) })
// @ts-expect-error web-only positioning requires an explicit output contract
portable({ values: [1], resolve: () => ({ position: 'sticky' }) })
// @ts-expect-error invalid portable field values are rejected
portable({ values: [1], resolve: () => ({ display: 'grid' }) })
// @ts-expect-error a dimensionless field cannot receive a logical length
portable({ values: [1], resolve: () => ({ opacity: dp(1) }) })
// @ts-expect-error a numeric-only portable gap does not accept percentage lengths
portable({ values: [1], resolve: () => ({ gap: percent(50) }) })
// @ts-expect-error a structured color cannot be assigned to a dimension
portable({ values: [1], resolve: () => ({ width: rgba(1, 2, 3) }) })
// @ts-expect-error typed theme references preserve the referenced field's value type
portable({ values: [1], resolve: () => ({ opacity: reference('ink') }) })
portable({
  values: [1],
  dynamic: 'number',
  // @ts-expect-error dynamic resolver overload has the same exact output checks
  resolve: (value) => ({ gap: value, typo: 2 }),
})
const webToken = defineTokenFor<Theme, WebInlineStyle>()
webToken({
  values: [1],
  resolve: () => ({ position: 'sticky', gridTemplateColumns: '1fr 1fr' }),
})
// @ts-expect-error explicit platform output still checks extra fields
webToken({ values: [1], resolve: () => ({ position: 'sticky', typo: 2 }) })
const nativeToken = defineTokenFor<Theme, NativeInlineStyle<'view'>>()
nativeToken({ values: [1], resolve: () => ({ elevation: 2 }) })
// @ts-expect-error native view output preserves the kind restriction
nativeToken({ values: [1], resolve: () => ({ fontSize: 14 }) })

const conditionalOutput = ():
  | { gap: number }
  | { gap: number; typo: number } => ({ gap: 1, typo: 2 })
// @ts-expect-error extra fields remain invalid on one branch of a resolver result union
portable({ values: [1], resolve: conditionalOutput })

const unrelatedReference = themeRef<{ missing: number; ink: number }>()
portable({
  values: [1],
  // @ts-expect-error matching value types do not admit keys absent from the factory's theme
  resolve: () => ({ gap: unrelatedReference('missing') }),
})
// @ts-expect-error an unrelated schema cannot change this theme key's actual value type
portable({ values: [1], resolve: () => ({ gap: unrelatedReference('ink') }) })
const compatibleReference = themeRef<{ step: number }>()
portable({ values: [1], resolve: () => ({ gap: compatibleReference('step') }) })
portable({
  values: [1],
  dynamic: 'number',
  // @ts-expect-error dynamic overload validates referenced theme keys too
  resolve: () => ({ gap: unrelatedReference('missing') }),
})
