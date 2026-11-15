import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

// A web app writing plain CSS in a sheet of a system native renders too.
export default defineCase({
  id: 'web-css-in-shared-style',
  description:
    'Web-only CSS (`cursor`) in portable `$style`, from a web-only app on a shared system',
  category: 'platform',
  baseline: { stage: 'compile', namesFix: true },
  fix: /withTargets\(system, \['web'\]\)/,
  sheets: () => [ui.stylesheet({ Root: { $style: { cursor: 'pointer' } } })],
})
