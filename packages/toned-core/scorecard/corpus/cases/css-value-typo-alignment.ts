import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'css-value-typo-alignment',
  description:
    "A British spelling of an alignment keyword (`alignItems: 'centre'`)",
  category: 'css',
  baseline: { stage: 'compile', namesFix: true },
  fix: /'center'/,
  sheets: () => [
    ui.stylesheet({
      Root: {
        ':hover': { '@platform web': { $style: { alignItems: 'centre' } } },
      },
    }),
  ],
})
