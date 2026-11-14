import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'both-platform-spellings',
  description:
    "`'@platform web'` and the alias `'@platform.web'` in one part (one block is lost)",
  category: 'platform',
  baseline: { stage: 'compile', namesFix: true },
  fix: /alias|canonical|both|merge/i,
  sheets: () => [
    ui.stylesheet({
      Root: {
        '@platform web': { $style: { cursor: 'pointer' } },
        '@platform.web': { $style: { userSelect: 'none' } },
      },
    }),
  ],
})
