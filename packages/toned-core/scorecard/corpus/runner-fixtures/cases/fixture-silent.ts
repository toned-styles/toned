import { ui } from '../../../fixture/system.ts'
import { defineCase } from '../../case.ts'

export default defineCase({
  id: 'fixture-silent',
  description: 'a correct sheet',
  category: 'tokens',
  baseline: { stage: 'silent', namesFix: false },
  fix: 'gap',
  sheets: () => [ui.stylesheet({ Root: { gap: 1 } })],
})
