import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'css-property-typo',
  description: "A CSS property typo inside `'@platform web': { $style }`",
  category: 'css',
  baseline: { stage: 'compile', namesFix: true },
  fix: /backgroundColor/,
  sheets: () => [
    ui.stylesheet({
      Root: { '@platform web': { $style: { backgroundColour: 'red' } } },
    }),
  ],
})
