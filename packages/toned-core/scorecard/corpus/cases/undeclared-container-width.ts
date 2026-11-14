import { dp } from '../../../core/values.ts'
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'undeclared-container-width',
  description:
    "A container width the system does not declare (`q.container('card', dp(400))`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /add 400 to conditions\.widths\.containers\.card/,
  sheets: () => [
    ui.stylesheet((q) => ({
      Root: { [q.container('card', dp(400))]: { padding: 2 } },
    })),
  ],
})
