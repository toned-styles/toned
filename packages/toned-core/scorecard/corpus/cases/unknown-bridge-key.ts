import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-bridge-key',
  description: 'A `$bridge` naming a bridge the system does not declare',
  category: 'bridges',
  baseline: { stage: 'compile', namesFix: true },
  fix: /Did you mean 'placeholder'/,
  sheets: () => [
    ui.stylesheet({ Root: { $bridge: { placeholdr: { color: 'red' } } } }),
  ],
})
