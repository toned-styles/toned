import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'css-variable-in-portable-style',
  description: 'A CSS variable in portable `$style` (`--brand`)',
  category: 'platform',
  baseline: { stage: 'compile', namesFix: true },
  fix: /@platform web/,
  sheets: () => [ui.stylesheet({ Root: { $style: { '--brand': 'red' } } })],
})
