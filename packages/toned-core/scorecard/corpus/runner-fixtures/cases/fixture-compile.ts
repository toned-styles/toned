import { ui } from '../../../fixture/system.ts'
import { defineCase } from '../../case.ts'

export default defineCase({
  id: 'fixture-compile',
  description: 'a token value outside the scale',
  category: 'tokens',
  baseline: { stage: 'compile', namesFix: false },
  fix: /1 \| 2 \| 4/,
  sheets: () => [ui.stylesheet({ Root: { gap: 3 } })],
})
