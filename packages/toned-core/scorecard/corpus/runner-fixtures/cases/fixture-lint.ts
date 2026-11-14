import { ui } from '../../../fixture/system.ts'
import { defineCase } from '../../case.ts'

const a = { $style: { opacity: 0.5 } } as const
const b = { $style: { zIndex: 1 } } as const

export default defineCase({
  id: 'fixture-lint',
  description: 'two spreads of $style into one part: only the linter sees it',
  category: 'composition',
  baseline: { stage: 'lint', namesFix: true },
  fix: '$style: [',
  sheets: () => [ui.stylesheet({ Root: { ...a, ...b } })],
})
