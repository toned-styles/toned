/* oxlint-disable no-dupe-keys -- the duplicate key is the mistake under test */
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'duplicate-platform-key',
  description: "The literal key `'@platform web'` written twice in one part",
  category: 'composition',
  baseline: { stage: 'compile', namesFix: true },
  fix: /same name/,
  sheets: () => [
    ui.stylesheet({
      Root: {
        '@platform web': { $style: { cursor: 'pointer' } },
        '@platform web': { $style: { userSelect: 'none' } },
      },
    }),
  ],
})
