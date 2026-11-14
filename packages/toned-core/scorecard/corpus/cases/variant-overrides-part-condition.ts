import type { Variants } from '../../../types/index.ts'
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'variant-overrides-part-condition',
  description:
    "A variant sets `opacity` with no condition, expecting the part's `'@md'` value to still apply at md (a Tailwind-style merge); later declarations win, so the variant's value holds at md too",
  category: 'cascade',
  baseline: { stage: 'runtime', namesFix: true },
  fix: /Repeat the condition inside the variant/,
  sheets: () => [
    ui
      .stylesheet({ Root: { opacity: 1, '@md': { opacity: 0.5 } } })
      .variants(($: Variants<{ tone: 'quiet' | 'loud' }>) => ({
        [$.tone('quiet')]: { Root: { opacity: 0 } },
      })),
  ],
})
