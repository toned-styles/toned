import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

// Two shared fragments, each with its own platform block.
const focusRing = { '@platform web': { $style: { outlineWidth: 2 } } } as const
const pointer = { '@platform web': { $style: { cursor: 'pointer' } } } as const

export default defineCase({
  id: 'second-spread-overwrites',
  description:
    "A second object spread of a `'@platform web'` block replaces the first",
  category: 'composition',
  baseline: { stage: 'silent', namesFix: false },
  fix: /spread|overwr|\$style: \[/i,
  sheets: () => [ui.stylesheet({ Root: { ...focusRing, ...pointer } })],
})
