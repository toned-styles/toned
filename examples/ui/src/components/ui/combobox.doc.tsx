import { doc, c } from '@/lib/doc'
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty, ComboboxTrigger } from './combobox'

export default doc({
  components: [
    c({ Combobox }, {}),
    c({ ComboboxTrigger }, {}),
    c({ ComboboxInput }, { placeholder: 'Search...' }),
    c({ ComboboxContent }, {}),
    c({ ComboboxList }, {}),
    c({ ComboboxItem }, { value: 'apple', children: 'Apple' }),
    c({ ComboboxEmpty }, { children: 'No results found.' }),
  ],
  preview: (C) => (
    <C.Combobox>
      <C.ComboboxTrigger>
        <C.ComboboxInput />
      </C.ComboboxTrigger>
      <C.ComboboxContent>
        <C.ComboboxList>
          <C.ComboboxItem value="apple">Apple</C.ComboboxItem>
          <C.ComboboxItem value="banana">Banana</C.ComboboxItem>
          <C.ComboboxItem value="cherry">Cherry</C.ComboboxItem>
        </C.ComboboxList>
        <C.ComboboxEmpty />
      </C.ComboboxContent>
    </C.Combobox>
  ),
})
