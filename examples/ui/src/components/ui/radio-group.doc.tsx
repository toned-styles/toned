import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Label } from './label.tsx'
import { RadioGroup, RadioGroupItem } from './radio-group.tsx'

const row = t({ flexLayout: 'row', alignItems: 'center', gap: 2 })

export default doc({
  description:
    'A set of options where exactly one is selected. The arrow keys move the selection.',
  components: [
    c({ RadioGroup }, { defaultValue: 'comfortable', 'aria-label': 'Density' }),
    c({ RadioGroupItem }, { value: 'comfortable' }),
  ],
  preview: (C) => (
    <C.RadioGroup>
      <div {...row}>
        <C.RadioGroupItem value="default" id="density-default" />
        <Label htmlFor="density-default">Default</Label>
      </div>
      <div {...row}>
        <C.RadioGroupItem value="comfortable" id="density-comfortable" />
        <Label htmlFor="density-comfortable">Comfortable</Label>
      </div>
      <div {...row}>
        <C.RadioGroupItem value="compact" id="density-compact" />
        <Label htmlFor="density-compact">Compact</Label>
      </div>
    </C.RadioGroup>
  ),
})
