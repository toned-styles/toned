import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'sibling-channel-not-declared',
  description:
    "A part reading a preceding sibling's declared state by its channel key (`':sib-open'`, as a label reads a disabled control) when the state does not declare the sibling relation",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /relations: \['sibling'\]/,
  sheets: () => [
    ui.stylesheet({
      Root: { gap: 1 },
      Item: { gap: 0, ':sib-open': { gap: 2 } },
    }),
  ],
})
