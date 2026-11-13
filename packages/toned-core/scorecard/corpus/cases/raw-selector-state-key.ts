import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'raw-selector-state-key',
  description: 'A raw attribute selector written as a state key',
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: false },
  fix: /:open\b|'open'/,
  sheets: () => [
    ui.stylesheet({ Root: { gap: 1, "[data-state='open']": { gap: 2 } } }),
  ],
})
