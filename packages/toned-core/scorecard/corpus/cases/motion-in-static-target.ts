import { defineMotion } from '../../../motion/index.ts'
import { defineSystem } from '../../../system/index.ts'
import { opacity } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

// An email-only system: there is no host to animate.
const mail = defineSystem({
  id: 'corpus-motion-mail',
  targets: ['email'],
  tokens: { opacity },
})

export default defineCase({
  id: 'motion-in-static-target',
  description:
    'Motion declared for a system whose only target is email, which renders one static style',
  category: 'motion',
  baseline: { stage: 'compile', namesFix: true },
  fix: 'with a variant',
  exercise: () => defineMotion(mail, { properties: ['opacity'] }),
})
