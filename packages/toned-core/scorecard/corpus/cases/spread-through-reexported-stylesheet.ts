import { stylesheet } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

// Two shared fragments, each with its own `$style`.
const muted = { $style: { opacity: 0.5 } } as const
const raised = { $style: { zIndex: 1 } } as const

export default defineCase({
  id: 'spread-through-reexported-stylesheet',
  description:
    "A second spread's `$style` replaces the first, in a sheet written with the design-system module's re-exported `stylesheet` (`export const { stylesheet } = system`)",
  category: 'composition',
  baseline: { stage: 'lint', namesFix: true },
  fix: /\$style: \[/,
  sheets: () => [stylesheet({ Root: { ...muted, ...raised } })],
})
