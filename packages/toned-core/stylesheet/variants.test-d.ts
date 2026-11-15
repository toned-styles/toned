import { defineSystem, defineToken } from '../system/index.ts'
import type { Variants } from '../types/index.ts'
import {
  stylesheetVariantCombinations,
  stylesheetVariants,
} from './variants.ts'

const ui = defineSystem({
  id: 'variant-vocabulary-types',
  tokens: {
    opacity: defineToken({
      values: [0, 1] as const,
      resolve: (opacity) => ({ opacity }),
    }),
  },
})
const sheet = ui
  .stylesheet({ Root: { opacity: 0 } })
  .variants(
    (
      $: Variants<{ tone: 'quiet' | 'loud'; active: boolean; cols: 2 | 3 }>,
    ) => ({
      [$.tone('loud')]: { Root: { opacity: 1 } },
    }),
  )

const variants = stylesheetVariants(sheet)
const tone: readonly ('quiet' | 'loud')[] | undefined = variants.tone
const active: readonly boolean[] | undefined = variants.active
// A selector carries a number as its text.
const cols: readonly ('2' | '3')[] | undefined = variants.cols
// @ts-expect-error an axis the sheet does not declare
void variants.size
// @ts-expect-error a value the axis does not take
const wrong: readonly 'quiet'[] | undefined = variants.active

const [first] = stylesheetVariantCombinations(sheet, { cap: 64 })
const combination: { tone?: 'quiet' | 'loud'; active?: boolean } | undefined =
  first
// @ts-expect-error a combination is read-only
if (first) first.tone = 'quiet'

// An untyped sheet is a plain record.
const untyped: Readonly<Record<string, readonly (string | boolean)[]>> =
  stylesheetVariants(ui.stylesheet({ Root: { opacity: 0 } }) as object)
void [tone, active, cols, wrong, combination, untyped]
