import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-media',
  description: "An undeclared media name (`'@mdd'`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: false },
  fix: /@md(?!\w)|'md'/,
  sheets: () => [ui.stylesheet({ Root: { gap: 1, '@mdd': { gap: 2 } } })],
})
