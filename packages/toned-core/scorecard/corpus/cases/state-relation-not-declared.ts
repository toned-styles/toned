import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'state-relation-not-declared',
  description:
    "A cross-part key (`'Root:open'`) reading a declared state through a relation the system does not declare for it",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /relations: \['ancestor'\]/,
  sheets: () => [
    ui.stylesheet({
      Root: { gap: 1 },
      Item: { gap: 0 },
      'Root:open': { Item: { gap: 2 } },
    }),
  ],
})
