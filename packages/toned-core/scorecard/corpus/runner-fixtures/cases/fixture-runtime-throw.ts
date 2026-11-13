import { defineCase } from '../../case.ts'

export default defineCase({
  id: 'fixture-runtime-throw',
  description: 'a probe that throws',
  category: 'tokens',
  baseline: { stage: 'runtime', namesFix: false },
  fix: 'the right answer',
  exercise: () => {
    throw new Error('something went wrong')
  },
})
