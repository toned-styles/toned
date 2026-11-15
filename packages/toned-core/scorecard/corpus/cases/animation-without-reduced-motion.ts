import { defineAnimations } from '../../../system/index.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'animation-without-reduced-motion',
  description:
    'A system animation that does not say what reduced motion does with it',
  category: 'motion',
  baseline: { stage: 'compile', namesFix: true },
  fix: 'reducedMotion',
  exercise: () =>
    defineAnimations({
      spin: { keyframes: { to: { rotate: 360 } }, duration: 1000 },
    }),
})
