import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'animation-none-beside-animation-token',
  description:
    "The `animation` token at rest and a raw `animation: 'none'` under a condition, to stop the animation while open; the token writes `animationName`, and `animation: none` cannot be split",
  category: 'cascade',
  baseline: { stage: 'compile', namesFix: true },
  fix: /animationName: 'none'/,
  sheets: () => [
    ui.stylesheet({
      Root: {
        animation: 'fade-in',
        ':open': { '@platform web': { $style: { animation: 'none' } } },
      },
    }),
  ],
})
