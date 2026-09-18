import { c, doc } from '@/lib/doc.tsx'
import { NativeSelect } from './native-select.tsx'

export default doc({
  components: [c({ NativeSelect }, {})],
  preview: (C) => (
    <C.NativeSelect style={{ width: '200px' }}>
      <option value="">Select an option</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
      <option value="3">Option 3</option>
    </C.NativeSelect>
  ),
})
