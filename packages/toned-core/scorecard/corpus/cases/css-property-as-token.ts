import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'css-property-as-token',
  description:
    'A CSS property written as a token key (`cursor` beside the tokens)',
  category: 'tokens',
  baseline: { stage: 'compile', namesFix: true },
  fix: /@platform web'?: \{ \$style/,
  sheets: () => [ui.stylesheet({ Root: { gap: 1, cursor: 'pointer' } })],
})
