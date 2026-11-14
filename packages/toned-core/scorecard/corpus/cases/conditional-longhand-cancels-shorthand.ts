import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'conditional-longhand-cancels-shorthand',
  description:
    'A conditional longhand (`transitionProperty`) under an unconditional shorthand (`transition`); in Chromium transition-property becomes `all`',
  category: 'cascade',
  baseline: { stage: 'silent', namesFix: false },
  fix: /shorthand|longhand/i,
  sheets: () => [
    ui.stylesheet((q) => ({
      Root: {
        '@platform web': { $style: { transition: 'opacity 200ms ease' } },
        [q.state('open')]: {
          '@platform web': { $style: { transitionProperty: 'transform' } },
        },
      },
    })),
  ],
})
