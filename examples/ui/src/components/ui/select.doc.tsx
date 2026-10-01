import { c, doc } from '@/lib/doc.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select.tsx'

export default doc({
  description:
    'A button that opens a list of options and shows the chosen one. Type to jump to an option; the arrow keys move through the list.',
  components: [
    c({ Select }, { defaultValue: 'europe-west' }),
    c({ SelectTrigger }, { size: 'default', 'aria-label': 'Region' }),
    c({ SelectValue }, { placeholder: 'Choose a region' }),
    c({ SelectContent }, {}),
    c({ SelectItem }, { value: 'europe-west', children: 'Europe (West)' }),
  ],
  preview: (C) => (
    <C.Select>
      <C.SelectTrigger>
        <C.SelectValue />
      </C.SelectTrigger>
      <C.SelectContent>
        <SelectGroup>
          <SelectLabel>Europe</SelectLabel>
          <C.SelectItem />
          <SelectItem value="europe-north">Europe (North)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Americas</SelectLabel>
          <SelectItem value="us-east">US (East)</SelectItem>
          <SelectItem value="us-west">US (West)</SelectItem>
        </SelectGroup>
      </C.SelectContent>
    </C.Select>
  ),
})
