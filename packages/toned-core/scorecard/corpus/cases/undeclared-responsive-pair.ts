import { responsive } from '../../fixture/responsive.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'undeclared-responsive-pair',
  description:
    "A responsive token set under a condition it does not declare (`'@lg'` for a token whose pairs are `['sm', 'md']`)",
  category: 'conditions',
  baseline: { stage: 'compile', namesFix: true },
  fix: /declares maxW for 'sm', 'md' only\. Add 'lg' to responsiveTokens\.maxW/,
  system: responsive,
  sheets: () => [
    responsive.stylesheet({ Root: { maxW: 'gutter', '@lg': { maxW: '32' } } }),
  ],
})
