import { doc, c } from '@/lib/doc'
import { Label } from './label'
import { RadioGroup, RadioGroupItem } from './radio-group'

export default doc({
  components: [
    c({ RadioGroup }, { defaultValue: 'option-1' }),
    c({ RadioGroupItem }, { value: 'option-1' }),
  ],
  preview: (C) => (
    <C.RadioGroup>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <C.RadioGroupItem value="option-1" id="r1" />
        <Label htmlFor="r1">Default</Label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <C.RadioGroupItem value="option-2" id="r2" />
        <Label htmlFor="r2">Comfortable</Label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <C.RadioGroupItem value="option-3" id="r3" />
        <Label htmlFor="r3">Compact</Label>
      </div>
    </C.RadioGroup>
  ),
})
