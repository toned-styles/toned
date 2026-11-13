import { fileURLToPath } from 'node:url'

import { loadOutput } from '../../../outputs/runner.ts'
import { defineCase } from '../case.ts'

const root = fileURLToPath(
  new URL('../../fixture/mistakes/unawaited', import.meta.url),
)

export default defineCase({
  id: 'unawaited-output',
  description: 'An output file default-exporting an unawaited promise',
  category: 'outputs',
  baseline: { stage: 'build', namesFix: true },
  fix: /\bawait\b/,
  build: () => loadOutput('unawaited', { outputs: ['*.toned.ts'], root }),
})
