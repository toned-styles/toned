import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unlisted-css-variable',
  description:
    '`var(--brand)` in a namespaced system without `externalCssVariables`',
  category: 'variables',
  baseline: { stage: 'silent', namesFix: false },
  fix: /externalCssVariables/,
  sheets: () => [
    ui.stylesheet({
      Root: {
        '@platform web': { $style: { backgroundColor: 'var(--brand)' } },
      },
    }),
  ],
})
