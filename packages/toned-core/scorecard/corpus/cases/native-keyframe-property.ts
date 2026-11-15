import { defineAnimations, defineSystem } from '../../../system/index.ts'
import { defineCase } from '../case.ts'

const glow = defineAnimations({
  glow: {
    keyframes: { '50%': { boxShadow: '0 0 8px red' } },
    duration: 2000,
    reducedMotion: 'none',
  },
})

export default defineCase({
  id: 'native-keyframe-property',
  description:
    'A keyframe property native cannot animate, in a system that targets native',
  category: 'motion',
  baseline: { stage: 'compile', namesFix: true },
  fix: "keyframe property 'boxShadow' cannot animate on native",
  exercise: () =>
    defineSystem({
      id: 'corpus-native-keyframes',
      targets: ['web', 'native'],
      tokens: { ...glow.tokens },
      conditions: { animations: glow.animations },
    }),
})
