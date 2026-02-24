import { doc, c } from '@/lib/doc'
import { ToggleGroup, ToggleGroupItem } from './toggle-group'

export default doc({
  components: [
    c({ ToggleGroup }, { type: 'single' as const }),
    c({ ToggleGroupItem }, { value: 'a', children: 'A' }),
  ],
  preview: (C) => (
    <C.ToggleGroup>
      <C.ToggleGroupItem value="a">A</C.ToggleGroupItem>
      <C.ToggleGroupItem value="b">B</C.ToggleGroupItem>
      <C.ToggleGroupItem value="c">C</C.ToggleGroupItem>
    </C.ToggleGroup>
  ),
})
