import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'unsplittable-shorthand-in-derived-sheet',
  description:
    'A derived sheet adds a conditional longhand (`transitionProperty`) beside a base `transition` that names a variable, which cannot be split into longhands',
  category: 'cascade',
  baseline: { stage: 'runtime', namesFix: true },
  fix: /Write the longhands/,
  sheets: () => [
    ui
      .stylesheet({
        Root: {
          '@platform web': { $style: { transition: 'var(--app-surface)' } },
        },
      })
      .extend({
        Root: {
          ':open': {
            '@platform web': { $style: { transitionProperty: 'transform' } },
          },
        },
      }),
  ],
})
