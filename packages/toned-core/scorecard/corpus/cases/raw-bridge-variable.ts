import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'raw-bridge-variable',
  description:
    'A declared bridge parameter written by hand (`--toned-b-placeholder-color` in `$style`)',
  category: 'bridges',
  baseline: { stage: 'lint', namesFix: true },
  fix: 'write $bridge: { placeholder: { color: … } }',
  sheets: () => [
    ui.stylesheet({
      Root: {
        '@platform web': { $style: { '--toned-b-placeholder-color': 'red' } },
      },
    }),
  ],
})
