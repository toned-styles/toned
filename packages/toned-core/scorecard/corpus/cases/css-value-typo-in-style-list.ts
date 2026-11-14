import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'css-value-typo-in-style-list',
  description:
    "A keyword typo in a `$style` list entry (`textTransform: 'upercase'`)",
  category: 'css',
  baseline: { stage: 'compile', namesFix: true },
  fix: /'uppercase'/,
  sheets: () => [
    ui.stylesheet({
      Label: {
        $kind: 'text',
        '@platform web': {
          $style: [{ fontWeight: 600 }, { textTransform: 'upercase' }],
        },
      },
    }),
  ],
})
