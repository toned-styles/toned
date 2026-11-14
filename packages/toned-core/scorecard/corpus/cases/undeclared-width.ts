import { dp } from '../../../core/values.ts'
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'undeclared-width',
  description:
    'A width threshold the system does not declare (`q.media(dp(700))`)',
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /add 700 to conditions\.widths\.media/,
  sheets: () => [
    ui.stylesheet((q) => ({ Root: { [q.media(dp(700))]: { gap: 2 } } })),
  ],
})
