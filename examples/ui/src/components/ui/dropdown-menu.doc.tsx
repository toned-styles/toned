import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './dropdown-menu.tsx'

// A checkbox item is controlled: the menu owns no state of its own.
function NotifyItem() {
  const [checked, setChecked] = useState(true)
  return (
    <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
      Notify the team
    </DropdownMenuCheckboxItem>
  )
}

export default doc({
  description:
    'A menu of actions that opens from a button. The arrow keys move through it and typing jumps to an item.',
  components: [
    c({ DropdownMenu }, {}),
    c({ DropdownMenuTrigger }, { asChild: true }),
    c({ DropdownMenuContent }, { align: 'start' }),
    c({ DropdownMenuLabel }, { children: 'Release 2.4' }),
    c({ DropdownMenuItem }, { children: 'Edit notes' }),
    c({ DropdownMenuSeparator }, {}),
  ],
  preview: (C) => (
    <C.DropdownMenu>
      <C.DropdownMenuTrigger>
        <Button variant="outline">
          Actions
          <ChevronDownIcon />
        </Button>
      </C.DropdownMenuTrigger>
      <C.DropdownMenuContent>
        <C.DropdownMenuLabel />
        <DropdownMenuGroup>
          <C.DropdownMenuItem>
            Edit notes
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </C.DropdownMenuItem>
          <DropdownMenuItem>
            Duplicate
            <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Move to project</DropdownMenuItem>
        </DropdownMenuGroup>
        <C.DropdownMenuSeparator />
        <NotifyItem />
        <C.DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          Delete release
        </DropdownMenuItem>
      </C.DropdownMenuContent>
    </C.DropdownMenu>
  ),
})
