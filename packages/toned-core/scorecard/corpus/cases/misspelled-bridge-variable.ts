import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'misspelled-bridge-variable',
  description: 'A misspelled bridge variable (`--toned-b-placeholdr-color`)',
  category: 'bridges',
  baseline: { stage: 'compile', namesFix: true },
  fix: /placeholder/,
  sheets: () => [
    ui.stylesheet({
      Root: {
        '@platform web': { $style: { '--toned-b-placeholdr-color': 'red' } },
      },
    }),
  ],
})
