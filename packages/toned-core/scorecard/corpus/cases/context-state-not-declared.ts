import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'context-state-not-declared',
  description:
    "A descendant reading a provider state its context does not offer (`'@within card:focus-within'`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /states: \[.*'focus-within'.*\]/,
  sheets: () => [
    ui.stylesheet({
      Root: { gap: 1, '@within card:focus-within': { gap: 2 } },
    }),
  ],
})
