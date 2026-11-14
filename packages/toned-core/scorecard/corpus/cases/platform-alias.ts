import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'platform-alias',
  description:
    "The deprecated `'@platform.web'` alias instead of `'@platform web'`",
  category: 'platform',
  baseline: { stage: 'lint', namesFix: true },
  fix: "write '@platform web'",
  sheets: () => [
    ui.stylesheet({
      Root: { '@platform.web': { $style: { cursor: 'pointer' } } },
    }),
  ],
})
