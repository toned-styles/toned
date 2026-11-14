import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'bad-condition-algebra',
  description:
    "A condition expression naming an unknown condition (`'@md&!xx'`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /(declared|available) (media|conditions)[^;]*'@?md'/i,
  sheets: () => [ui.stylesheet({ Root: { gap: 1, '@md&!xx': { gap: 2 } } })],
})
