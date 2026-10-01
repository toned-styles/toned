import { t } from '@toned/systems/base'
import {
  CalendarIcon,
  FileTextIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react'

import { c, doc } from '@/lib/doc.tsx'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command.tsx'

export default doc({
  description:
    'A searchable list of commands. Typing filters the list; the arrow keys and Enter choose an item.',
  components: [
    c({ Command }, { label: 'Command menu' }),
    c({ CommandInput }, { placeholder: 'Search commands' }),
    c({ CommandList }, {}),
    c({ CommandEmpty }, { children: 'No commands match.' }),
    c({ CommandGroup }, { heading: 'Suggestions' }),
    c({ CommandItem }, {}),
  ],
  preview: (C) => (
    <C.Command
      {...t({
        width: '100%',
        maxWidth: '380px',
        height: 'auto',
        borderColor: 'default',
        borderWidth: 'thin',
        shadow: 'medium',
      })}
    >
      <C.CommandInput />
      <C.CommandList>
        <C.CommandEmpty />
        <C.CommandGroup>
          <C.CommandItem>
            <CalendarIcon />
            Open calendar
          </C.CommandItem>
          <C.CommandItem>
            <FileTextIcon />
            New release note
            <CommandShortcut>⌘N</CommandShortcut>
          </C.CommandItem>
        </C.CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <UserIcon />
            Profile
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <SettingsIcon />
            Preferences
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </C.CommandList>
    </C.Command>
  ),
})
