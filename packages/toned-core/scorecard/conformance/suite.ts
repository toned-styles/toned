/** The target conformance suite: every fixture feature on every target. */
import { fileURLToPath } from 'node:url'

import { features } from './features.ts'
import { buildMatrix } from './matrix.ts'
import { targets } from './targets.ts'

export const runConformanceSuite = () =>
  buildMatrix({
    features,
    targets,
    featuresModule: fileURLToPath(new URL('./features.ts', import.meta.url)),
    targetsModule: fileURLToPath(new URL('./targets.ts', import.meta.url)),
  })
