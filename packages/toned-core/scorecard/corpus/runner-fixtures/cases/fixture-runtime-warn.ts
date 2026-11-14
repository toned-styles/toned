import { defineCase } from '../../case.ts'

export default defineCase({
  id: 'fixture-runtime-warn',
  description: 'a probe that warns',
  category: 'tokens',
  baseline: { stage: 'runtime', namesFix: true },
  fix: /use gap/,
  exercise: () => console.warn('[toned] dropped; use gap instead'),
})
