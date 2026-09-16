import { createVariantSelector } from '../stylesheet/variantSelector.ts'

const $ = createVariantSelector<{
  size: 's' | 'm'
  variant: 'accent' | 'danger'
  active?: boolean
  order: 0 | 1
  value: 'a' | 'b' | 'a=b|[c]%' | '*'
}>()

const forward = $.size('s').variant('accent')
const reverse = $.variant('accent').size('s')
const forwardKey: '[size=s][variant=accent]' = forward
const reverseKey: typeof forwardKey = reverse
const combined: '[active=true][order=0][size=s][variant=accent]' = $.variant(
  'accent',
)
  .order(0)
  .active(true)
  .size('s')
const multi: '[value=a][value=b]' = $.value('b', 'a', 'b')
const escaped: '[value=a%3Db%7C%5Bc%5D%25]' = $.value('a=b|[c]%')
const star: '[value=%2A]' = $.value('*')
const table = { [$.size('s').variant('accent')]: { value: 1 } }
const selected: { value: number } | undefined = table[reverse]
void [forwardKey, reverseKey, combined, multi, escaped, star, selected]

// @ts-expect-error values remain tied to their axis
$.size('accent')
// @ts-expect-error no empty value list
$.size()
// @ts-expect-error a chain cannot select an axis a second time
$.size('s').size('m')
// @ts-expect-error all values in an OR selection must be valid
$.size('s', 'unknown')
// @ts-expect-error key identity must not pretend a different selection
const wrong: '[size=m]' = $.size('s')
void wrong
