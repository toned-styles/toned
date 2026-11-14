import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'state-at-sheet-level',
  description:
    "A declared state at the top of a sheet (`{ ':open': { Root: … } }`), where it applies to no part",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /inside a part|'Root:open'/,
  sheets: () => [ui.stylesheet({ ':open': { Root: { gap: 1 } } })],
})
