import { defineMotion } from '../../../motion/index.ts'
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'motion-unknown-state',
  description: "A motion transition keyed by an undeclared state (`':opne'`)",
  category: 'motion',
  baseline: { stage: 'compile', namesFix: true },
  fix: /:open\b/,
  exercise: () =>
    defineMotion(ui, {
      properties: ['opacity'],
      states: { ':opne': { type: 'spring' } },
    }),
})
