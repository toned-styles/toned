import { c, doc } from '@/lib/doc.tsx'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command.tsx'

export default doc({
  components: [
    c({ Command }, {}),
    c({ CommandInput }, { placeholder: 'Type a command...' }),
    c({ CommandList }, {}),
    c({ CommandEmpty }, { children: 'No results found.' }),
    c({ CommandGroup }, { heading: 'Suggestions' }),
    c({ CommandItem }, { children: 'Calendar' }),
  ],
  preview: (C) => (
    <div style={{ width: '300px' }}>
      <C.Command>
        <C.CommandInput />
        <C.CommandList>
          <C.CommandEmpty />
          <C.CommandGroup>
            <C.CommandItem>Calendar</C.CommandItem>
            <C.CommandItem>Search</C.CommandItem>
            <C.CommandItem>Settings</C.CommandItem>
          </C.CommandGroup>
        </C.CommandList>
      </C.Command>
    </div>
  ),
})
