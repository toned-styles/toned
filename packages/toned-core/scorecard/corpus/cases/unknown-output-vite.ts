import { fileURLToPath } from 'node:url'

import { build } from 'vite'

import { tonedOutputs } from '../../../vite/index.ts'
import { defineCase } from '../case.ts'

const root = fileURLToPath(new URL('../../fixture', import.meta.url))

export default defineCase({
  id: 'unknown-output-vite',
  description:
    'A Vite app importing an output that no `*.toned.ts` declares (`toned:nope/manifest`)',
  category: 'outputs',
  baseline: { stage: 'build', namesFix: true },
  fix: /\bsample\b/,
  build: () =>
    build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [tonedOutputs({ outputs: ['outputs/*.toned.ts'] })],
      build: {
        write: false,
        rollupOptions: { input: `${root}/mistakes/vite/entry.js` },
      },
    }),
})
