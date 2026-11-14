import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'width-spelled-another-way',
  description:
    "A declared width written in another number spelling (`'@>=600.0px'` for the declared 600)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /'@>=600px'|plain number/,
  sheets: () => [
    ui.stylesheet({
      Root: { padding: 1, '@>=600.0px': { padding: 2 } },
    }),
  ],
})
