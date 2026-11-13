import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'web-only-value-in-portable-style',
  description: 'A web-only value in portable `$style` (`cursor`)',
  category: 'platform',
  baseline: { stage: 'compile', namesFix: false },
  fix: /@platform web/,
  sheets: () => [ui.stylesheet({ Root: { $style: { cursor: 'pointer' } } })],
})
