import { dp } from '../../../core/values.ts'
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

/** A breakpoint read from configuration: `number` to the compiler. */
const layout: { compactAt: number } = { compactAt: 700 }

export default defineCase({
  id: 'undeclared-width-computed',
  description:
    'A width threshold computed at runtime that the system does not declare (`q.media(dp(config.compactAt))`)',
  category: 'conditions',
  baseline: { stage: 'runtime', namesFix: true },
  fix: /add 700 to conditions\.widths\.media/,
  sheets: () => [
    ui.stylesheet((q) => ({
      Root: { [q.media(dp(layout.compactAt))]: { gap: 2 } },
    })),
  ],
})
