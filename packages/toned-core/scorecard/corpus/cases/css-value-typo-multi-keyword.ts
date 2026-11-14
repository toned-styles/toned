import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'css-value-typo-multi-keyword',
  description:
    "A typo in one word of a multi-keyword value (`display: 'inline flx'`)",
  category: 'css',
  baseline: { stage: 'compile', namesFix: true },
  fix: /'flx' in 'inline flx'.*'flex'/,
  sheets: () => [
    ui.stylesheet({
      Root: { '@platform web': { $style: { display: 'inline flx' } } },
    }),
  ],
})
