import { createVariantSelector } from './variantSelector.ts'

type Size = 's' | 'm' | 'l'
const $ = createVariantSelector<{
  size?: Size
  variant: 'accent' | 'quiet'
  active?: boolean
  order?: 0 | 1 | 2
  value: 'a=b|[c]%' | '*' | 'a'
}>()

const optional: '[size=s]' = $.size('s')
const chained: '[size=s][variant=accent]' = $.variant('accent').size('s')
const multi: '[size=m][size=s]' = $.size('s', 'm', 's')
const spread: '[size=l][size=s]' = $.size(...(['s', 'l'] as const))
const booleans: '[active=false][active=true]' = $.active(true, false, true)
const numbers: '[order=0][order=2]' = $.order(2, 0, 2)
const escaped: '[value=%2A][value=a%3Db%7C%5Bc%5D%25]' = $.value(
  'a=b|[c]%',
  '*',
)
const named: '$named$_active' = $('active')
void [optional, chained, multi, spread, booleans, numbers, escaped, named]

// @ts-expect-error optional axes permit omission, not undefined selectors
$.size(undefined)
// @ts-expect-error optional axes still need at least one selected value
$.size()
// @ts-expect-error a later OR value cannot come from a different axis
$.variant('accent').size('s', 'quiet')
// @ts-expect-error no undefined values inside an OR list
$.size('s', undefined)
// @ts-expect-error chained optional axes retain their vocabulary
$.variant('accent').order(3)
// @ts-expect-error already selected axes are unavailable
$.active(true).active(false)
// @ts-expect-error every selected value remains represented in the exact key
const incomplete: '[size=s]' = $.size('s', 'm')
void incomplete

// @ts-expect-error explicit tuple type arguments cannot lie about selected values
$.size<['s']>('m')
// @ts-expect-error the same check applies after selecting another axis
$.variant('accent').size<['s']>('m')

declare const dynamicValues: readonly [Size, ...Size[]]
const dynamic = $.size(...dynamicValues).variant('accent')
const dynamicKey: string = dynamic
// @ts-expect-error an unknown-length OR list must not promise a single-value key
const falsePromise: '[size=s][variant=accent]' = dynamic
void [dynamicKey, falsePromise]

// The vocabulary overload does not weaken selection ownership or explicit
// generic checking, even after identity has widened to a dynamic string.
// @ts-expect-error a dynamically selected axis still cannot be selected again
dynamic.size('s')
const explicit: '[size=m][size=s]' = $.size<readonly ['m', 's']>('m', 's')
const selectSize = $.size
const extracted: '[size=s]' = selectSize('s')
declare const oneSize: Size
const unionKey: '[size=l]' | '[size=m]' | '[size=s]' = $.size(oneSize)
void [explicit, extracted, unionKey]
