import { webRules } from '../../../web/rules.ts'
import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'web-rules-for-dom-fact',
  description:
    "The deprecated `$webRules` extension for a DOM fact (`'&[aria-disabled=true]'`) instead of a declared state",
  category: 'platform',
  baseline: { stage: 'lint', namesFix: true },
  fix: /declared state/,
  sheets: () => [
    ui.stylesheet({
      Root: {
        '@platform web': {
          $webRules: webRules({ '&[aria-disabled=true]': { opacity: 0.5 } }),
        },
      },
    }),
  ],
})
