import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unknown-context',
  description:
    "A descendant keyed on a context the system does not declare (`'@within crad:hover'`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /Declared contexts: .*'card'/,
  sheets: () => [
    ui.stylesheet({ Root: { gap: 1, '@within crad:hover': { gap: 2 } } }),
  ],
})
