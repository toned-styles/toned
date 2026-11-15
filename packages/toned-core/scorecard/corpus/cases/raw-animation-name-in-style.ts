import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'raw-animation-name-in-style',
  description:
    "A raw `animationName` in `$style`, in a system that declares its animations: the token is `animation: '<name>'`",
  category: 'motion',
  baseline: { stage: 'compile', namesFix: true },
  fix: "animation: '<name>'",
  sheets: () => [
    ui.stylesheet({
      Root: { '@platform web': { $style: { animationName: 'fade-in' } } },
    }),
  ],
})
