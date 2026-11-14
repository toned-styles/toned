import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-token-key',
  description: 'A token key the system does not declare (`gapp`)',
  category: 'tokens',
  baseline: { stage: 'compile', namesFix: false },
  fix: /'gap'/,
  sheets: () => [ui.stylesheet({ Root: { gapp: 1 } })],
})
