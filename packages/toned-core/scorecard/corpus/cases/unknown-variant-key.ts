import type { Variants } from '../../../index.ts'
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

type Mods = { size: 's' | 'm' }

export default defineCase({
  id: 'unknown-variant-key',
  description:
    'A variant rule keyed by a bare word, not `$.axis(value)` (`wat`)',
  category: 'composition',
  baseline: { stage: 'compile', namesFix: true },
  fix: /\$\.<axis>\(value\)/,
  sheets: () => [
    ui
      .stylesheet({ Root: { gap: 1 } })
      .variants((_$: Variants<Mods>) => ({ wat: { Root: { gap: 2 } } })),
  ],
})
