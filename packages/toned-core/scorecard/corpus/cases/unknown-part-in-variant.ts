import type { Variants } from '../../../index.ts'
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

type Mods = { size: 's' | 'm' }

export default defineCase({
  id: 'unknown-part-in-variant',
  description: 'A variant rule styling a part the sheet does not have (`Roo`)',
  category: 'composition',
  baseline: { stage: 'compile', namesFix: true },
  fix: /Did you mean 'Root'/,
  sheets: () => [
    ui.stylesheet({ Root: { gap: 1 } }).variants(($: Variants<Mods>) => ({
      [$.size('s')]: { Roo: { gap: 2 } },
    })),
  ],
})
