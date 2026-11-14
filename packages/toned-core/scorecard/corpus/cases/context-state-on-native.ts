import { defineSystem } from '../../../system/index.ts'
import { gap } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

// A system rendered on web and native: native has no provider hover.
const app = defineSystem({
  id: 'corpus-app',
  targets: ['web', 'native'],
  tokens: { gap },
  conditions: { contexts: { card: { states: ['hover'] } } },
})

export default defineCase({
  id: 'context-state-on-native',
  description:
    "A context state (`'@within card:hover'`) outside '@platform web' in a system that targets native",
  category: 'platform',
  baseline: { stage: 'compile', namesFix: true },
  fix: "put it under '@platform web'",
  system: app,
  sheets: () => [
    app.stylesheet({ Root: { gap: 1, '@within card:hover': { gap: 2 } } }),
  ],
})
