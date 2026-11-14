import { fileURLToPath } from 'node:url'

import { loadOutput } from '../../../outputs/runner.ts'
import { defineCase } from '../case.ts'

const root = fileURLToPath(
  new URL('../../fixture/mistakes/misspelled', import.meta.url),
)

export default defineCase({
  id: 'misspelled-output-key',
  description: 'An output file exporting `{ CSS }` instead of `{ css }`',
  category: 'outputs',
  baseline: { stage: 'build', namesFix: true },
  fix: '"css"',
  build: () => loadOutput('misspelled', { outputs: ['*.toned.ts'], root }),
})
