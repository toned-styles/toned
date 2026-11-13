import { defineCase } from '../../case.ts'

export default defineCase({
  id: 'fixture-build-probe',
  description: 'a build step outside buildStyles (an output build) that throws',
  category: 'outputs',
  baseline: { stage: 'build', namesFix: true },
  fix: 'the fix',
  build: async () => {
    throw new Error('output build failed; the fix is here')
  },
})
