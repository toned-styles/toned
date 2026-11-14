import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-bridge-property',
  description: 'A `$bridge` property the bridge does not declare (`colour`)',
  category: 'bridges',
  baseline: { stage: 'compile', namesFix: true },
  fix: /Its properties: 'color'/,
  sheets: () => [
    ui.stylesheet({
      Root: { ':open': { $bridge: { placeholder: { colour: 'red' } } } },
    }),
  ],
})
