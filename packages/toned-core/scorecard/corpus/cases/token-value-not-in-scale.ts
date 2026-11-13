import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'token-value-not-in-scale',
  description: 'A token value outside its finite scale (`gap: 3`)',
  category: 'tokens',
  baseline: { stage: 'compile', namesFix: true },
  fix: /0 \| 1 \| 2 \| 4/,
  sheets: () => [ui.stylesheet({ Root: { gap: 3 } })],
})
