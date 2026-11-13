import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-source-channel-part',
  description:
    "A source-channel key naming a part the sheet lacks (`'Nope:hover'`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /(declared|known|available) parts?[^{]*\bRoot\b/i,
  sheets: () => [
    ui.stylesheet({ Root: { gap: 1 }, 'Nope:hover': { Root: { gap: 2 } } }),
  ],
})
