import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'css-value-typo',
  description: "A CSS keyword typo (`cursor: 'pointr'`)",
  category: 'css',
  baseline: { stage: 'silent', namesFix: false },
  fix: /'pointer'/,
  sheets: () => [
    ui.stylesheet({
      Root: { '@platform web': { $style: { cursor: 'pointr' } } },
    }),
  ],
})
