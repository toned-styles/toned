import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Checkbox } from './checkbox.tsx'
import { Label } from './label.tsx'

export default doc({
  description:
    'A two-state control with an optional indeterminate state. Pair it with a label so the text is clickable too.',
  components: [c({ Checkbox }, { defaultChecked: true, disabled: false })],
  preview: (C) => (
    <div {...t({ flexLayout: 'column', gap: 3 })}>
      <div {...t({ flexLayout: 'row', alignItems: 'center', gap: 2 })}>
        <C.Checkbox id="checkbox-updates" />
        <Label htmlFor="checkbox-updates">Email me about new releases</Label>
      </div>
      <div {...t({ flexLayout: 'row', alignItems: 'center', gap: 2 })}>
        <Checkbox id="checkbox-digest" />
        <Label htmlFor="checkbox-digest">Send a weekly digest</Label>
      </div>
      <div {...t({ flexLayout: 'row', alignItems: 'center', gap: 2 })}>
        <Checkbox id="checkbox-locked" disabled />
        <Label htmlFor="checkbox-locked">Share usage data (unavailable)</Label>
      </div>
    </div>
  ),
})
