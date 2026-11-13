import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'condition-inside-style',
  description:
    "A state block written inside `$style` (`$style: { ':hover': … }`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /beside \$style/,
  sheets: () => [
    ui.stylesheet({ Root: { $style: { ':hover': { opacity: 0.5 } } } }),
  ],
})
