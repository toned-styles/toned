import { doc, c } from '@/lib/doc'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './select'

export default doc({
  components: [
    c({ Select }, {}),
    c({ SelectTrigger }, {}),
    c({ SelectValue }, { placeholder: 'Select a fruit' }),
    c({ SelectContent }, {}),
    c({ SelectItem }, { value: 'apple', children: 'Apple' }),
  ],
  preview: (C) => (
    <C.Select>
      <C.SelectTrigger>
        <C.SelectValue />
      </C.SelectTrigger>
      <C.SelectContent>
        <C.SelectItem value="apple">Apple</C.SelectItem>
        <C.SelectItem value="banana">Banana</C.SelectItem>
        <C.SelectItem value="cherry">Cherry</C.SelectItem>
      </C.SelectContent>
    </C.Select>
  ),
})
