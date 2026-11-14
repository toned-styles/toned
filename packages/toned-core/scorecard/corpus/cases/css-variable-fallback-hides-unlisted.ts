import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'css-variable-fallback-hides-unlisted',
  description:
    '`var(--progress, 0%)` for a variable set outside toned: the renamed name never resolves, so the fallback always wins',
  category: 'variables',
  baseline: { stage: 'compile', namesFix: true },
  fix: /externalCssVariables/,
  sheets: () => [
    ui.stylesheet({
      Bar: {
        '@platform web': { $style: { width: 'var(--progress, 0%)' } },
      },
    }),
  ],
})
