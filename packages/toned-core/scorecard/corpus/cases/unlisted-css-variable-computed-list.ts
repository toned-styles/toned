import { defineSystem } from '../../../index.ts'
import { gap } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

// A list built at runtime (`names.map(…)`) is `string[]` to the compiler, so
// the types cannot tell a listed name from an unlisted one.
const surfaces = ['surface', 'panel']
const system = defineSystem({
  id: 'computed-list',
  externalCssVariables: surfaces.map((name) => `--${name}`),
  tokens: { gap },
})

export default defineCase({
  id: 'unlisted-css-variable-computed-list',
  description:
    '`var(--brand)` in a namespaced system whose `externalCssVariables` is computed, not a literal tuple',
  category: 'variables',
  baseline: { stage: 'runtime', namesFix: true },
  fix: /externalCssVariables/,
  system,
  sheets: () => [
    system.stylesheet({
      Root: {
        '@platform web': { $style: { backgroundColor: 'var(--brand)' } },
      },
    }),
  ],
})
