import { defineSystem } from '../../../system/index.ts'
import { gap, opacity } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

// A system rendered on the web and in email: email has no hover.
const mail = defineSystem({
  id: 'corpus-mail',
  targets: ['web', 'email'],
  tokens: { gap, opacity },
})

export default defineCase({
  id: 'condition-in-static-target',
  description:
    "A `':hover'` block in a system that declares an email target, which renders one static style",
  category: 'platform',
  baseline: { stage: 'compile', namesFix: true },
  fix: 'use a variant',
  system: mail,
  sheets: () => [
    mail.stylesheet({ Root: { opacity: 1, ':hover': { opacity: 0.5 } } }),
  ],
})
