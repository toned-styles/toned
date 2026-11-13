import { defineSystem, defineToken } from '../../../../system/index.ts'
import { defineCase } from '../../case.ts'

const broken = defineSystem({
  id: 'broken',
  tokens: {
    gap: defineToken({
      values: [1],
      resolve: (): { gap: number } => {
        throw new Error('resolver failed')
      },
    }),
  },
})

export default defineCase({
  id: 'fixture-build',
  description: 'a resolver that throws during CSS generation',
  category: 'tokens',
  baseline: { stage: 'build', namesFix: false },
  fix: 'never',
  system: broken,
})
