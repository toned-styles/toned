import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'bad-condition-algebra',
  description:
    "A condition expression naming an unknown condition (`'@md&!xx'`)",
  category: 'conditions',
  baseline: { stage: 'runtime', namesFix: false },
  fix: /(declared|available) (media|conditions)[^@]*\bmd\b/i,
  sheets: () => [ui.stylesheet({ Root: { gap: 1, '@md&!xx': { gap: 2 } } })],
})
