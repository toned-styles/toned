/**
 * Compile-time contract: an override's cost is LINEAR in a token's value
 * count. `tsc` is the test — this file fails with TS2590 ("Expression
 * produces a union type that is too complex to represent") if the override
 * typing ever crosses a token's value union with itself again.
 *
 * The regression it pins: `ValidateDeclaration` answered every leaf with the
 * token's whole value union. A generic helper call inside the rules is
 * contextually typed before `Rules` is inferred, when the leaves it sees are
 * the constraint's own value union, so each became `Values & (Values | null)`
 * — crossed member by member. With `alphaChannel` that is 2N × 2N, and TS2590
 * fired at ~160 colours: a real palette.
 *
 * 1,000 colours here (2,001 leaf members with the alpha form and `null`), six
 * times past where the quadratic version broke.
 */
import { defineSystem, defineToken } from '@toned/core'
import { overrideStyles } from './index.ts'

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type Colour = `c${Digit}${Digit}${Digit}`

const values = [] as unknown as readonly Colour[]

const bgColor = defineToken({
  values,
  resolve: (value) => ({ backgroundColor: value }),
  alphaChannel: ['backgroundColor'],
})
const textColor = defineToken({
  values,
  resolve: (value) => ({ color: value }),
  alphaChannel: ['color'],
})
const gap = defineToken({
  values: [1, 2, 4, 6] as const,
  resolve: (value) => ({ gap: value }),
})

const system = defineSystem({ bgColor, textColor, gap })
const sheet = system.stylesheet({
  Root: { bgColor: 'c000', textColor: 'c999' },
  Body: { gap: 4, textColor: 'c123/50' },
})

/** The shape app code writes: a generic helper returning a platform block. */
const web = <const T extends Record<string, string>>($style: T) =>
  ({ '@platform web': { $style } }) as const

overrideStyles(sheet, {
  Root: web({ overflow: 'hidden' }),
  Body: { gap: 6 },
})
overrideStyles(sheet, { Body: web({ gap: '0.25rem' }) })
overrideStyles(sheet, (q) => ({
  Root: web({ overflow: 'hidden' }),
  Body: { [q.state('hover')]: { bgColor: 'c500/40' } },
}))
overrideStyles(sheet, { Body: { textColor: 'c042/75', bgColor: null } })

// Strictness survives the scale: every leaf is still checked.
overrideStyles(sheet, {
  Root: web({ overflow: 'hidden' }),
  // @ts-expect-error — not a colour the token declares
  Body: { textColor: 'c1000' },
})
// @ts-expect-error — the alpha form of an undeclared colour
overrideStyles(sheet, { Body: { bgColor: 'x000/50' } })
overrideStyles(sheet, {
  Root: web({ overflow: 'hidden' }),
  // @ts-expect-error — a token the system does not have
  Body: { txtColor: 'c000' },
})
// @ts-expect-error — a part the sheet never declared
overrideStyles(sheet, { Nope: web({ overflow: 'hidden' }) })
