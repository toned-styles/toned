import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'inherit-inside-condition',
  description: 'A CSS-wide keyword (`inherit`) inside a condition',
  category: 'cascade',
  baseline: { stage: 'silent', namesFix: false },
  fix: /inherit/,
  sheets: () => [
    ui.stylesheet({
      Root: {
        bgColor: 'accent',
        ':hover': {
          '@platform web': { $style: { backgroundColor: 'inherit' } },
        },
      },
    }),
  ],
})
