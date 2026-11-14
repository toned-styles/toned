import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'context-marker-in-condition',
  description:
    "A provider marker set under a condition (`':hover': { $context: 'card' }`); a marker is static",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: 'variant block',
  sheets: () => [ui.stylesheet({ Root: { ':hover': { $context: 'card' } } })],
})
