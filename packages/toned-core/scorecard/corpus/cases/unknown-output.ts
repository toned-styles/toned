// oxlint-disable-next-line typescript/triple-slash-reference -- how a consumer loads the `toned:` module types
/// <reference path="../../../vite/client.d.ts" />
import { fileURLToPath } from 'node:url'

// What a consumer's misspelled import type-checks as (erased: nothing loads).
import type manifest from 'toned:nope/manifest'

import { loadOutput } from '../../../outputs/runner.ts'
import { defineCase } from '../case.ts'

export type Manifest = typeof manifest

const root = fileURLToPath(new URL('../../fixture', import.meta.url))

export default defineCase({
  id: 'unknown-output',
  description:
    'Importing an output that no `*.toned.ts` declares (`toned:nope/manifest`)',
  category: 'outputs',
  baseline: { stage: 'runtime', namesFix: true },
  fix: /\bsample\b/,
  exercise: () => loadOutput('nope', { outputs: ['outputs/*.toned.ts'], root }),
})
