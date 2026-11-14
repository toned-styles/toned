import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-context-value',
  description:
    "A descendant keyed on a value its context does not declare (`'@within prose=article'`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /values: \[.*'article'.*\]/,
  sheets: () => [
    ui.stylesheet({ Root: { gap: 1, '@within prose=article': { gap: 2 } } }),
  ],
})
