import { ui } from '../../../fixture/system.ts'
import { defineCase } from '../../case.ts'

export default defineCase({
  id: 'fixture-regressed',
  description: 'recorded as caught at compile time, now silent',
  category: 'tokens',
  baseline: { stage: 'compile', namesFix: false },
  fix: 'gap',
  sheets: () => [ui.stylesheet({ Root: { gap: 2 } })],
})
