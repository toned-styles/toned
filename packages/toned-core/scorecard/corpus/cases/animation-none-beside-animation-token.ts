import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'animation-none-beside-animation-token',
  description:
    "The `animation` token at rest and a raw `animation: 'none'` under a condition, to stop the animation while open; the token's own stop is `animation: 'none'`",
  category: 'cascade',
  baseline: { stage: 'compile', namesFix: true },
  fix: /animation: 'none'/,
  sheets: () => [
    ui.stylesheet({
      Root: {
        animation: 'fade-in',
        ':open': { '@platform web': { $style: { animation: 'none' } } },
      },
    }),
  ],
})
