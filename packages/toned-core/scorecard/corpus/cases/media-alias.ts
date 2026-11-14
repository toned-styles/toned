import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'media-alias',
  description: "The `'@media md'` alias instead of `'@md'`",
  category: 'conditions',
  baseline: { stage: 'lint', namesFix: true },
  fix: "write '@md'",
  sheets: () => [ui.stylesheet({ Root: { '@media md': { gap: 2 } } })],
})
