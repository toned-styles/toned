import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-media-at-root',
  description:
    "An undeclared media name as a sheet-level block (`'@mdd': { Root: … }`)",
  category: 'conditions',
  baseline: { stage: 'runtime', namesFix: true },
  fix: /declared media: '@md'/,
  sheets: () => [
    ui.stylesheet({ Root: { gap: 1 }, '@mdd': { Root: { gap: 2 } } }),
  ],
})
