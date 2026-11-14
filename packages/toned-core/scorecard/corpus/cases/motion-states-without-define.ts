import { attachMotion } from '../../../motion/index.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'motion-states-without-define',
  description:
    "State-keyed transitions passed straight to `attachMotion`, with no system to check `':open'` against",
  category: 'motion',
  baseline: { stage: 'compile', namesFix: true },
  fix: 'defineMotion(system',
  exercise: () =>
    attachMotion(
      {},
      {
        properties: ['opacity'],
        states: { ':open': { type: 'spring' } },
      },
    ),
})
