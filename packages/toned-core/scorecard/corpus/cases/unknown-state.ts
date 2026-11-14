import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-state',
  description: "An undeclared state (`':opne'`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /:open\b|'open'/,
  sheets: () => [ui.stylesheet({ Root: { gap: 1, ':opne': { gap: 2 } } })],
})
