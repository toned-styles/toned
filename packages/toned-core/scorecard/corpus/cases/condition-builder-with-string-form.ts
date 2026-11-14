import { ui } from '../../fixture/system.ts'
import { defineCase } from '../case.ts'

export default defineCase({
  id: 'condition-builder-with-string-form',
  description:
    "A `q` builder where the string key is canonical (`[q.state('open')]` for `':open'`)",
  category: 'conditions',
  baseline: { stage: 'lint', namesFix: true },
  fix: "Write ':open'",
  sheets: () => [
    ui.stylesheet((q) => ({ Root: { [q.state('open')]: { opacity: 0.5 } } })),
  ],
})
