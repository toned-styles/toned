import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Label } from './label.tsx'
import { NativeSelect, NativeSelectOption } from './native-select.tsx'

export default doc({
  description:
    'The browser’s own select, styled to match the other fields. It uses the platform picker, which suits phones.',
  components: [
    c(
      { NativeSelect },
      { size: 'default', disabled: false, defaultValue: 'weekly' },
    ),
  ],
  preview: (C) => (
    <div {...t({ flexLayout: 'column', gap: 2 })}>
      <Label htmlFor="native-select-frequency">Digest frequency</Label>
      <C.NativeSelect id="native-select-frequency">
        <NativeSelectOption value="daily">Every day</NativeSelectOption>
        <NativeSelectOption value="weekly">Every week</NativeSelectOption>
        <NativeSelectOption value="monthly">Every month</NativeSelectOption>
        <NativeSelectOption value="never">Never</NativeSelectOption>
      </C.NativeSelect>
    </div>
  ),
})
