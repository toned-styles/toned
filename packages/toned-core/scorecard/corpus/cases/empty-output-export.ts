import { fileURLToPath } from 'node:url'

import { loadOutput } from '../../../outputs/runner.ts'
import { defineCase } from '../case.ts'

const root = fileURLToPath(
  new URL('../../fixture/mistakes/empty', import.meta.url),
)

export default defineCase({
  id: 'empty-output-export',
  description: 'An output file whose default export is `{}`',
  category: 'outputs',
  baseline: { stage: 'build', namesFix: true },
  fix: /\bcss\b.*\bdata\b/,
  build: () => loadOutput('empty', { outputs: ['*.toned.ts'], root }),
})
